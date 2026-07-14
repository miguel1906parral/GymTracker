import { useWorkouts } from '../context/WorkoutContext'
import { formatDate, formatTime, formatDuration } from '../format'

export default function History({ onStart, onContinue, onOpen }) {
  const { history, active } = useWorkouts()

  return (
    <div className="flex min-h-dvh flex-col bg-gray-100">
      <header className="bg-white px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Gym Tracker</h1>
      </header>

      <main className="flex-1 space-y-3 p-4 pb-28">
        <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
          Historial
        </h2>

        {history.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            Todavía no hay entrenamientos. ¡Empieza el primero!
          </p>
        )}

        {history.map((workout) => {
          const totalSets = workout.exercises.reduce(
            (n, e) => n + e.sets.length,
            0,
          )
          return (
            <button
              key={workout.id}
              onClick={() => onOpen(workout.id)}
              className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm active:bg-gray-50"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gray-900">
                  {formatDate(workout.startedAt)}
                </span>
                <span className="text-sm text-gray-500">
                  {formatTime(workout.startedAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {workout.exercises.length}{' '}
                {workout.exercises.length === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
                {totalSets} {totalSets === 1 ? 'serie' : 'series'} ·{' '}
                {formatDuration(workout.startedAt, workout.finishedAt)}
              </p>
            </button>
          )
        })}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        {active ? (
          <button
            onClick={onContinue}
            className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-white active:bg-amber-600"
          >
            Continuar entrenamiento en curso
          </button>
        ) : (
          <button
            onClick={onStart}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white active:bg-green-700"
          >
            Nuevo entrenamiento
          </button>
        )}
      </footer>
    </div>
  )
}
