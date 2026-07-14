import Dexie from 'dexie'

// Un único registro por entrenamiento; los ejercicios y series van embebidos
// en el propio documento, así borrar un entrenamiento no deja huérfanos.
// `status` se indexa porque IndexedDB no puede indexar valores null
// (no serviría un índice sobre finishedAt para buscar el activo).
export const db = new Dexie('gym-tracker')

db.version(1).stores({
  workouts: '++id, status, startedAt',
})

export function createWorkout() {
  return {
    status: 'active', // 'active' | 'done'
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exercises: [],
  }
}
