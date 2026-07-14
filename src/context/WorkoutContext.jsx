import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { db, createWorkout } from '../db'

const WorkoutContext = createContext(null)

export function WorkoutProvider({ children }) {
  const [active, setActive] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshHistory = useCallback(async () => {
    const done = await db.workouts
      .where('status')
      .equals('done')
      .sortBy('startedAt')
    setHistory(done.reverse())
  }, [])

  // Al arrancar: recuperar un entrenamiento en curso (si la pestaña se cerró
  // sin finalizar) y cargar el historial.
  useEffect(() => {
    async function load() {
      const inProgress = await db.workouts
        .where('status')
        .equals('active')
        .first()
      if (inProgress) setActive(inProgress)
      await refreshHistory()
      setLoading(false)
    }
    load()
  }, [refreshHistory])

  // Toda mutación pasa por aquí: actualiza estado y persiste en IndexedDB,
  // de forma que el entrenamiento en curso sobrevive a un cierre accidental.
  const persistActive = useCallback(async (workout) => {
    setActive(workout)
    await db.workouts.put(workout)
  }, [])

  const startWorkout = useCallback(async () => {
    const workout = createWorkout()
    workout.id = await db.workouts.add(workout)
    setActive(workout)
  }, [])

  const addExercise = useCallback(
    (name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      persistActive({
        ...active,
        exercises: [
          ...active.exercises,
          { id: crypto.randomUUID(), name: trimmed, sets: [] },
        ],
      })
    },
    [active, persistActive],
  )

  const removeExercise = useCallback(
    (exerciseId) => {
      persistActive({
        ...active,
        exercises: active.exercises.filter((e) => e.id !== exerciseId),
      })
    },
    [active, persistActive],
  )

  const addSet = useCallback(
    (exerciseId, reps, weight) => {
      persistActive({
        ...active,
        exercises: active.exercises.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                sets: [...e.sets, { id: crypto.randomUUID(), reps, weight }],
              }
            : e,
        ),
      })
    },
    [active, persistActive],
  )

  const removeSet = useCallback(
    (exerciseId, setId) => {
      persistActive({
        ...active,
        exercises: active.exercises.map((e) =>
          e.id === exerciseId
            ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
            : e,
        ),
      })
    },
    [active, persistActive],
  )

  // Finalizar: se exige al menos una serie registrada. Los ejercicios que se
  // quedaron sin series se descartan al guardar.
  const finishWorkout = useCallback(async () => {
    const exercises = active.exercises.filter((e) => e.sets.length > 0)
    if (exercises.length === 0) {
      return {
        ok: false,
        error: 'Añade al menos un ejercicio con una serie antes de finalizar.',
      }
    }
    const finished = {
      ...active,
      exercises,
      status: 'done',
      finishedAt: new Date().toISOString(),
    }
    await db.workouts.put(finished)
    setActive(null)
    await refreshHistory()
    return { ok: true }
  }, [active, refreshHistory])

  const discardWorkout = useCallback(async () => {
    await db.workouts.delete(active.id)
    setActive(null)
  }, [active])

  const deleteWorkout = useCallback(
    async (id) => {
      await db.workouts.delete(id)
      await refreshHistory()
    },
    [refreshHistory],
  )

  const value = {
    active,
    history,
    loading,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    finishWorkout,
    discardWorkout,
    deleteWorkout,
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
