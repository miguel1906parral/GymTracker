import { db, createRoutine, createWorkout } from './db.js'

/**
 * Guarda una rutina y sus ejercicios.
 *
 * Va todo dentro de una transacción porque son dos tablas: sin ella, un fallo a
 * mitad dejaría una rutina vacía en la lista, sin ejercicios y sin manera de
 * saber que está incompleta.
 */
export async function saveRoutine({ name, notes, exercises }) {
  return db.transaction('rw', db.routines, db.routineExercises, async () => {
    const routineId = await db.routines.add(createRoutine({ name, notes }))
    await db.routineExercises.bulkAdd(
      exercises.map((e, i) => ({
        routineId,
        exerciseId: e.exerciseId,
        order: i,
        targetSets: e.targetSets ?? null,
        targetRepsMin: e.targetRepsMin ?? null,
        targetRepsMax: e.targetRepsMax ?? null,
        restSeconds: null,
      })),
    )
    return routineId
  })
}

export async function deleteRoutine(routineId) {
  await db.transaction('rw', db.routines, db.routineExercises, async () => {
    await db.routineExercises.where('routineId').equals(routineId).delete()
    await db.routines.delete(routineId)
  })
}

/**
 * Lee las rutinas con sus ejercicios ya resueltos contra el catálogo.
 *
 * IndexedDB no tiene JOIN, así que el cruce se hace aquí: se leen todos los
 * enlaces de una vez y se agrupan en memoria, en lugar de lanzar una consulta
 * por rutina (que sería N+1 viajes a la base de datos).
 */
export async function listRoutines() {
  const routines = await db.routines.orderBy('createdAt').reverse().toArray()
  if (routines.length === 0) return []

  const links = await db.routineExercises.toArray()
  const catalog = await db.exercises.bulkGet([
    ...new Set(links.map((l) => l.exerciseId)),
  ])
  const porId = new Map(catalog.filter(Boolean).map((e) => [e.id, e]))

  return routines.map((routine) => ({
    ...routine,
    exercises: links
      .filter((l) => l.routineId === routine.id)
      .sort((a, b) => a.order - b.order)
      .map((link) => ({ link, exercise: porId.get(link.exerciseId) ?? null })),
  }))
}

/**
 * Empieza un entrenamiento a partir de una rutina: crea la sesión y copia sus
 * ejercicios.
 *
 * "Copia" es la palabra clave. Los ejercicios se COPIAN a `workoutExercises` en
 * lugar de que la sesión mire la rutina cada vez. Así, si mañana cambias "Día de
 * empuje", los entrenamientos que ya hiciste siguen contando lo que hiciste
 * aquel día. Un historial que cambia solo cuando editas una plantilla no sirve
 * de nada. Por eso también se copia el nombre de la rutina en la sesión.
 */
export async function startWorkoutFromRoutine(routineId) {
  return db.transaction(
    'rw',
    db.routines,
    db.routineExercises,
    db.workouts,
    db.workoutExercises,
    async () => {
      const enCurso = await db.workouts.where('status').equals('active').first()
      if (enCurso)
        return { ok: false, error: 'Ya tienes un entrenamiento en curso.' }

      const routine = await db.routines.get(routineId)
      if (!routine) return { ok: false, error: 'Esa rutina ya no existe.' }

      const links = await db.routineExercises
        .where('routineId')
        .equals(routineId)
        .sortBy('order')

      const workoutId = await db.workouts.add(
        createWorkout({ routineId, name: routine.name }),
      )
      await db.workoutExercises.bulkAdd(
        links.map((l, i) => ({
          workoutId,
          exerciseId: l.exerciseId,
          order: i,
          notes: '',
          // Los objetivos viajan con la copia para poder verlos mientras
          // entrenas ("objetivo 4 × 8-12") sin volver a consultar la rutina.
          targetSets: l.targetSets,
          targetRepsMin: l.targetRepsMin,
          targetRepsMax: l.targetRepsMax,
        })),
      )
      return { ok: true, workoutId }
    },
  )
}
