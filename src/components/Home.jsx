import { useWorkouts } from '../context/WorkoutContext'

export default function Home({ onStart, onContinue, onExplore }) {
  const { active } = useWorkouts()

  return (
    <div className="flex min-h-dvh flex-col bg-gray-100">
      <header className="bg-white px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Gym Tracker</h1>
      </header>

      <main className="flex-1 space-y-3 p-4">
        <button
          onClick={onExplore}
          className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm active:bg-gray-50"
        >
          <span className="font-semibold text-gray-900">
            Explorar ejercicios
          </span>
          <span className="mt-1 block text-sm text-gray-500">
            Busca en el catálogo en español o en inglés.
          </span>
        </button>
      </main>

      <footer className="border-t border-gray-200 bg-white p-4">
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
