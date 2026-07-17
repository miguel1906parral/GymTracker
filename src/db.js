import Dexie from 'dexie'

export const db = new Dexie('gym-tracker')

// v1: un único registro por entrenamiento, con ejercicios y series embebidos y
// nombres de ejercicio en texto libre. Se mantiene declarada para que Dexie
// sepa migrar las instalaciones que aún estén en esa versión.
db.version(1).stores({
  workouts: '++id, status, startedAt',
})

// v2: modelo normalizado. Las series pasan a tabla propia para poder consultar
// "todas las series de este ejercicio" por índice, sin recorrer el historial
// entero: IndexedDB no tiene JOINs, así que lo que no está indexado se filtra a
// mano en JS.
//
// Notas sobre los índices:
// - `status` se indexa como texto en vez de mirar si `finishedAt` está vacío
//   porque IndexedDB no indexa null/undefined: la fila activa no aparecería.
// - Por lo mismo, `isCustom` es 0|1 y no booleano (los booleanos tampoco son
//   claves válidas). `isWarmup` sí es booleano: nunca se indexa, se filtra en
//   memoria sobre las series ya cargadas de un ejercicio.
// - `[exerciseId+performedAt]` resuelve en una pasada la consulta del gimnasio:
//   "¿qué levanté la última vez en esto?".
// - `sets` guarda copias de `workoutId` y `exerciseId` que ya están en
//   `workoutExercises`. Es duplicación deliberada: sin JOINs, es lo que permite
//   ir directo a las series de un ejercicio. Una serie nunca cambia de
//   ejercicio ni de sesión, así que no pueden desincronizarse.
db.version(2)
  .stores({
    exercises:
      'id, name, nameNormalized, category, bodyPart, target, equipment, isCustom, *secondaryMuscles',
    routines: '++id, name, createdAt',
    routineExercises: '++id, routineId, exerciseId, [routineId+order]',
    workouts: '++id, status, date, startedAt, routineId',
    workoutExercises: '++id, workoutId, exerciseId, [workoutId+order]',
    sets: '++id, workoutExerciseId, workoutId, exerciseId, [exerciseId+performedAt]',
    meta: 'key',
  })
  .upgrade((tx) => {
    // Los entrenamientos de v1 eran pruebas y su forma es incompatible con el
    // modelo nuevo (ejercicios embebidos, sin id de catálogo).
    return tx.table('workouts').clear()
  })

// v3: el dataset trae `muscle_group`, un tercer campo de músculo distinto de
// `target` en 1.322 de los 1.324 ejercicios, así que se indexa para poder
// filtrar por él.
//
// El resto de campos del catálogo (instrucciones EN/ES, imagen, gif y
// atribución) NO aparecen aquí y no hacen falta: la cadena de `stores` declara
// solo la clave primaria y los índices. IndexedDB guarda el objeto entero tal
// cual, así que cualquier propiedad no listada se persiste igualmente; lo único
// que no se puede hacer con ella es buscar por índice. Como las instrucciones y
// la imagen siempre se leen a través del ejercicio ya localizado, no necesitan
// índice propio.
db.version(3).stores({
  exercises:
    'id, name, nameNormalized, category, bodyPart, target, muscleGroup, equipment, isCustom, *secondaryMuscles',
})

export function createWorkout({
  routineId = null,
  name = null,
  date = new Date(),
} = {}) {
  return {
    status: 'active', // 'active' | 'done'
    date: date.toISOString().slice(0, 10), // 'YYYY-MM-DD'
    startedAt: date.toISOString(),
    finishedAt: null,
    routineId,
    // Copia del nombre de la rutina en el momento de empezar. Es a propósito:
    // si mañana renombras o borras "Día de empuje", este entrenamiento debe
    // seguir contando lo que hiciste ese día, no lo que la rutina diga ahora.
    // `name` no está en la cadena de `stores` y no hace falta que esté: eso solo
    // declara clave primaria e índices, y el objeto se guarda entero igualmente.
    name,
    notes: '',
  }
}

export function createRoutine({ name, notes = '' }) {
  const now = new Date().toISOString()
  return { name, notes, createdAt: now, updatedAt: now }
}

// Borrar una sesión implica borrar sus ejercicios y series: al separar las
// series en su propia tabla dejan de irse solas con el entrenamiento. La
// transacción evita quedarse a medias y dejar series huérfanas.
export function deleteWorkout(workoutId) {
  return db.transaction('rw', db.workouts, db.workoutExercises, db.sets, () => {
    db.sets.where('workoutId').equals(workoutId).delete()
    db.workoutExercises.where('workoutId').equals(workoutId).delete()
    db.workouts.delete(workoutId)
  })
}
