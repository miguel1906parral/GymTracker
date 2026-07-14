import { useState } from 'react'
import { useWorkouts } from '../context/WorkoutContext'
import { formatDate, formatTime, formatWeight } from '../format'
import ConfirmDialog from './ConfirmDialog'

function SetForm({ onAdd }) {
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [error, setError] = useState(null)

  function submit(e) {
    e.preventDefault()
    const repsNum = Number.parseInt(reps, 10)
    // Acepta coma como separador decimal (teclado numérico en español)
    const weightNum = Number.parseFloat(weight.replace(',', '.'))
    if (!Number.isInteger(repsNum) || repsNum < 1) {
      setError('Las repeticiones deben ser un entero mayor que 0.')
      return
    }
    if (Number.isNaN(weightNum) || weightNum < 0) {
      setError(
        'Indica el peso en kg (usa 0 para ejercicios con peso corporal).',
      )
      return
    }
    setError(null)
    onAdd(repsNum, weightNum)
    setReps('')
    setWeight('')
  }

  return (
    <form onSubmit={submit} className="mt-2">
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="Reps"
          className="w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Peso (kg)"
          className="w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white active:bg-gray-700"
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </form>
  )
}

function ExerciseCard({ exercise }) {
  const { addSet, removeSet, removeExercise } = useWorkouts()

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{exercise.name}</h3>
        <button
          onClick={() => removeExercise(exercise.id)}
          className="text-sm text-red-600 active:text-red-800"
          aria-label={`Eliminar ${exercise.name}`}
        >
          Eliminar
        </button>
      </div>

      {exercise.sets.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100">
          {exercise.sets.map((set, i) => (
            <li
              key={set.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="text-gray-500">Serie {i + 1}</span>
              <span className="font-medium text-gray-900">
                {set.reps} × {formatWeight(set.weight)} kg
              </span>
              <button
                onClick={() => removeSet(exercise.id, set.id)}
                className="text-gray-400 active:text-red-600"
                aria-label={`Eliminar serie ${i + 1}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <SetForm onAdd={(reps, weight) => addSet(exercise.id, reps, weight)} />
    </div>
  )
}

export default function ActiveWorkout({ onDone }) {
  const { active, addExercise, finishWorkout, discardWorkout } = useWorkouts()
  const [name, setName] = useState('')
  const [finishError, setFinishError] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  function submitExercise(e) {
    e.preventDefault()
    if (!name.trim()) return
    addExercise(name)
    setName('')
  }

  async function handleFinish() {
    const result = await finishWorkout()
    if (!result.ok) {
      setFinishError(result.error)
      return
    }
    onDone()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-100">
      <header className="bg-white px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">
          Entrenamiento en curso
        </h1>
        <p className="text-sm text-gray-500">
          {formatDate(active.startedAt)} · {formatTime(active.startedAt)}
        </p>
      </header>

      <main className="flex-1 space-y-3 p-4 pb-40">
        {active.exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            Añade tu primer ejercicio para empezar.
          </p>
        )}
        {active.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </main>

      <footer className="fixed inset-x-0 bottom-0 space-y-3 border-t border-gray-200 bg-white p-4">
        <form onSubmit={submitExercise} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio"
            className="w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white active:bg-gray-700"
          >
            Añadir
          </button>
        </form>

        {finishError && <p className="text-sm text-red-600">{finishError}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setConfirmDiscard(true)}
            className="flex-1 rounded-xl bg-gray-100 py-3 font-medium text-gray-700 active:bg-gray-200"
          >
            Descartar
          </button>
          <button
            onClick={handleFinish}
            className="flex-[2] rounded-xl bg-green-600 py-3 font-semibold text-white active:bg-green-700"
          >
            Finalizar entrenamiento
          </button>
        </div>
      </footer>

      {confirmDiscard && (
        <ConfirmDialog
          title="Descartar entrenamiento"
          message="Se perderán todos los ejercicios y series de este entrenamiento. Esta acción no se puede deshacer."
          confirmLabel="Descartar"
          onConfirm={async () => {
            await discardWorkout()
            onDone()
          }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  )
}
