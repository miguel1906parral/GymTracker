import { createContext, useCallback, useContext } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, createWorkout, deleteWorkout } from '../db.js'

const WorkoutContext = createContext(null)

export function WorkoutProvider({ children }) {
  // Antes este componente guardaba el entrenamiento en un useState y había que
  // acordarse de reescribirlo en IndexedDB (y de recargarlo) en cada cambio. Con
  // tres tablas relacionadas eso se vuelve inmanejable: añadir una serie tocaría
  // `sets`, y habría que refrescar a mano lo que se ve en pantalla.
  //
  // `useLiveQuery` le da la vuelta: la pantalla se calcula SIEMPRE desde la base
  // de datos. Dexie apunta qué tablas lee esta consulta y la vuelve a ejecutar
  // sola cuando alguna cambia. Así solo hay una fuente de verdad (IndexedDB) y es
  // imposible que la pantalla y el disco se desincronicen: no existe la copia en
  // memoria que podría quedarse vieja.
  const data = useLiveQuery(async () => {
    const workout = await db.workouts.where('status').equals('active').first()
    if (!workout) return { workout: null, items: [] }

    const links = await db.workoutExercises
      .where('workoutId')
      .equals(workout.id)
      .sortBy('order')
    const sets = await db.sets.where('workoutId').equals(workout.id).toArray()

    // IndexedDB no tiene JOIN: `workoutExercises` solo guarda el id del
    // ejercicio, así que el nombre hay que ir a buscarlo al catálogo y unirlo
    // aquí, en JavaScript. `bulkGet` los trae todos de una vez y devuelve un
    // array en el mismo orden que los ids que le pasas.
    const catalog = await db.exercises.bulkGet(links.map((l) => l.exerciseId))

    return {
      workout,
      items: links.map((link, i) => ({
        link,
        exercise: catalog[i] ?? null,
        sets: sets
          .filter((s) => s.workoutExerciseId === link.id)
          .sort((a, b) => a.setNumber - b.setNumber),
      })),
    }
  }, [])

  const active = data?.workout ?? null
  const items = data?.items ?? []

  const startWorkout = useCallback(async () => {
    const existing = await db.workouts.where('status').equals('active').first()
    if (existing) return existing.id
    return db.workouts.add(createWorkout())
  }, [])

  const addExercise = useCallback(
    async (exerciseId) => {
      if (!active) return
      const count = await db.workoutExercises
        .where('workoutId')
        .equals(active.id)
        .count()
      await db.workoutExercises.add({
        workoutId: active.id,
        exerciseId,
        order: count,
        notes: '',
      })
    },
    [active],
  )

  const removeExercise = useCallback(async (workoutExerciseId) => {
    // Las series ya no viven dentro del ejercicio, así que borrar el ejercicio
    // no se las lleva por delante: hay que borrarlas explícitamente. La
    // transacción garantiza que o se van las dos cosas o no se va ninguna, sin
    // dejar series apuntando a un ejercicio que ya no existe.
    await db.transaction('rw', db.workoutExercises, db.sets, async () => {
      await db.sets
        .where('workoutExerciseId')
        .equals(workoutExerciseId)
        .delete()
      await db.workoutExercises.delete(workoutExerciseId)
    })
  }, [])

  const addSet = useCallback(async (link, reps, weight) => {
    await db.transaction('rw', db.sets, async () => {
      const previas = await db.sets
        .where('workoutExerciseId')
        .equals(link.id)
        .count()
      // Cada serie es una fila propia que apunta a su sesión y a su ejercicio.
      // `workoutId` y `exerciseId` son copias deliberadas de lo que ya está en
      // `workoutExercises`: sin ellas, calcular un récord obligaría a cruzar dos
      // tablas a mano en cada consulta.
      await db.sets.add({
        workoutExerciseId: link.id,
        workoutId: link.workoutId,
        exerciseId: link.exerciseId,
        setNumber: previas + 1,
        reps,
        weight,
        isWarmup: false,
        performedAt: new Date().toISOString(),
      })
    })
  }, [])

  const removeSet = useCallback(async (setId) => {
    await db.transaction('rw', db.sets, async () => {
      const set = await db.sets.get(setId)
      if (!set) return
      await db.sets.delete(setId)
      // Renumerar las que quedan: si borras la serie 2 de tres, sin esto te
      // quedarían la 1 y la 3, y la siguiente que añadieras volvería a ser la 3.
      const restantes = await db.sets
        .where('workoutExerciseId')
        .equals(set.workoutExerciseId)
        .sortBy('setNumber')
      await Promise.all(
        restantes.map((s, i) => db.sets.update(s.id, { setNumber: i + 1 })),
      )
    })
  }, [])

  // Lee de la base de datos en vez de fiarse de `items` (lo que hay pintado en
  // pantalla): una operación de guardado debe decidir sobre el estado real del
  // disco, no sobre una copia que podría ir un render por detrás.
  const finishWorkout = useCallback(async () => {
    const workoutId = active?.id
    if (!workoutId)
      return { ok: false, error: 'No hay entrenamiento en curso.' }

    return db.transaction(
      'rw',
      db.workouts,
      db.workoutExercises,
      db.sets,
      async () => {
        const links = await db.workoutExercises
          .where('workoutId')
          .equals(workoutId)
          .toArray()
        const sets = await db.sets
          .where('workoutId')
          .equals(workoutId)
          .toArray()

        if (sets.length === 0) {
          return {
            ok: false,
            error:
              'Añade al menos un ejercicio con una serie antes de finalizar.',
          }
        }

        // Los ejercicios que se quedaron sin ninguna serie se descartan al
        // guardar, igual que hacía la versión anterior.
        const conSeries = new Set(sets.map((s) => s.workoutExerciseId))
        const vacios = links.filter((l) => !conSeries.has(l.id))
        await db.workoutExercises.bulkDelete(vacios.map((l) => l.id))

        await db.workouts.update(workoutId, {
          status: 'done',
          finishedAt: new Date().toISOString(),
        })
        return { ok: true }
      },
    )
  }, [active?.id])

  const discardWorkout = useCallback(async () => {
    if (!active) return
    await deleteWorkout(active.id)
  }, [active])

  const value = {
    // `data` es undefined mientras la primera consulta está en vuelo; eso es lo
    // que distingue "todavía no lo sé" de "no hay entrenamiento activo".
    loading: data === undefined,
    active,
    items,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    finishWorkout,
    discardWorkout,
  }

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  )
}

export function useWorkouts() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkouts debe usarse dentro de WorkoutProvider')
  return ctx
}
