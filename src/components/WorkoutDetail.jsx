import { useState } from 'react'
import { useWorkouts } from '../context/WorkoutContext'
import { formatDate, formatTime, formatDuration, formatWeight } from '../format'
import ConfirmDialog from './ConfirmDialog'

export default function WorkoutDetail({ workoutId, onBack }) {
  const { history, deleteWorkout } = useWorkouts()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const workout = history.find((w) => w.id === workoutId)
  if (!workout) return null

  return (
    <div className="flex min-h-dvh flex-col bg-gray-100">
      <header className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <button
          onClick={onBack}
          className="text-2xl leading-none text-gray-500"
          aria-label="Volver"
        >
          ‹
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {formatDate(workout.startedAt)}
          </h1>
          <p className="text-sm text-gray-500">
            {formatTime(workout.startedAt)} – {formatTime(workout.finishedAt)} ·{' '}
            {formatDuration(workout.startedAt, workout.finishedAt)}
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-3 p-4 pb-28">
        {workout.exercises.map((exercise) => (
          <div key={exercise.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">{exercise.name}</h3>
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
                </li>
              ))}
            </ul>
          </div>
        ))}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full rounded-xl bg-red-50 py-3 font-semibold text-red-600 active:bg-red-100"
        >
          Eliminar entrenamiento
        </button>
      </footer>

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar entrenamiento"
          message="Se eliminará permanentemente este entrenamiento del historial. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={async () => {
            await deleteWorkout(workout.id)
            onBack()
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
