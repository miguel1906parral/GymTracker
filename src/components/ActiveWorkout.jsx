import { useState } from 'react'
import { useWorkouts } from '../context/WorkoutContext'
import { formatTime, formatWeight } from '../format'
import ConfirmDialog from './ConfirmDialog'
import ExerciseSearch from './ExerciseSearch'

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

  const campo =
    'tnum w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-center text-[15px] text-ink-100 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none'

  return (
    <form onSubmit={submit} className="mt-2.5">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="reps"
          aria-label="Repeticiones"
          className={campo}
        />
        <span className="text-ink-400">×</span>
        <input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="kg"
          aria-label="Peso en kg"
          className={campo}
        />
        <button
          type="submit"
          className="press shrink-0 rounded-lg bg-volt-500 px-4 py-2 text-[15px] font-bold text-ink-950"
        >
          Añadir
        </button>
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </form>
  )
}

function ExerciseCard({ item, indice }) {
  const { addSet, removeSet, removeExercise } = useWorkouts()
  const { link, exercise, sets } = item
  // El ejercicio se busca en el catálogo por su id; si el catálogo aún no ha
  // terminado de cargar, se muestra el id en lugar de romper.
  const nombre = exercise?.name ?? link.exerciseId
  const objetivo = link.targetSets
    ? `objetivo ${link.targetSets} × ${
        link.targetRepsMin === link.targetRepsMax
          ? link.targetRepsMin
          : `${link.targetRepsMin}-${link.targetRepsMax}`
      }`
    : null

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="tnum text-[11px] font-bold text-volt-500">
              {String(indice + 1).padStart(2, '0')}
            </span>
            <h3 className="text-[15px] leading-tight font-semibold text-ink-100">
              {nombre}
            </h3>
          </div>
          {exercise?.nameEs && (
            <p className="mt-0.5 pl-6 text-[13px] text-ink-400">
              {exercise.nameEs}
            </p>
          )}
          {objetivo && (
            <p className="tnum mt-1 pl-6 text-[11px] font-medium tracking-wide text-ink-300 uppercase">
              {objetivo}
            </p>
          )}
        </div>
        <button
          onClick={() => removeExercise(link.id)}
          className="press shrink-0 rounded-md px-2 py-1 text-[13px] text-ink-400 active:text-danger"
          aria-label={`Quitar ${nombre}`}
        >
          Quitar
        </button>
      </div>

      {sets.length > 0 && (
        <ul className="mt-3 space-y-1">
          {sets.map((set) => (
            <li
              key={set.id}
              className="flex items-center gap-3 rounded-lg bg-ink-850 px-3 py-2"
            >
              <span className="tnum w-4 text-[12px] font-semibold text-ink-400">
                {set.setNumber}
              </span>
              {/* Los números son el contenido de esta app: van grandes, en
                  negrita y con cifras de ancho fijo para que no bailen. */}
              <span className="tnum flex-1 text-[15px] font-semibold text-ink-100">
                {set.reps}
                <span className="mx-1.5 font-normal text-ink-400">×</span>
                {formatWeight(set.weight)}
                <span className="ml-1 text-[12px] font-normal text-ink-400">
                  kg
                </span>
              </span>
              <button
                onClick={() => removeSet(set.id)}
                className="press rounded-md p-1 text-ink-400 active:text-danger"
                aria-label={`Eliminar serie ${set.setNumber}`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SetForm onAdd={(reps, weight) => addSet(link, reps, weight)} />
    </div>
  )
}

export default function ActiveWorkout() {
  const { active, items, addExercise, finishWorkout, discardWorkout } =
    useWorkouts()
  const [finishError, setFinishError] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [picking, setPicking] = useState(false)

  const totalSeries = items.reduce((n, i) => n + i.sets.length, 0)

  async function handleFinish() {
    const result = await finishWorkout()
    if (!result.ok) setFinishError(result.error)
  }

  // El campo de texto libre para el nombre del ejercicio desapareció: los
  // ejercicios salen del catálogo, porque una serie tiene que apuntar a un id
  // real para que los récords puedan agruparse por ejercicio.
  if (picking) {
    return (
      <div className="flex h-dvh flex-col">
        <header className="flex shrink-0 items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <h1 className="text-[27px] leading-none font-bold">Añadir</h1>
          <button
            onClick={() => setPicking(false)}
            className="press text-[15px] font-medium text-ink-400"
          >
            Cancelar
          </button>
        </header>
        <ExerciseSearch
          autoFocus
          onPick={async (e) => {
            await addExercise(e.id)
            setPicking(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          {/* Punto latiendo: comunica "esto está pasando ahora" sin texto. */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-volt-500" />
          </span>
          <span className="text-[11px] font-bold tracking-[0.12em] text-volt-500 uppercase">
            En curso
          </span>
        </div>
        <h1 className="mt-1 text-[27px] leading-none font-bold text-ink-100">
          {active.name ?? 'Entrenamiento'}
        </h1>
        <p className="tnum mt-1.5 text-[13px] text-ink-400">
          Desde las {formatTime(active.startedAt)} · {items.length}{' '}
          {items.length === 1 ? 'ejercicio' : 'ejercicios'} · {totalSeries}{' '}
          {totalSeries === 1 ? 'serie' : 'series'}
        </p>
      </header>

      <main className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-48">
        {items.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-400">
            Este entrenamiento no tiene ejercicios todavía.
          </p>
        )}
        {items.map((item, i) => (
          <ExerciseCard key={item.link.id} item={item} indice={i} />
        ))}

        <button
          onClick={() => setPicking(true)}
          className="press w-full rounded-2xl border border-dashed border-ink-700 py-3.5 text-[15px] font-medium text-ink-300 active:border-ink-600"
        >
          + Añadir ejercicio del catálogo
        </button>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-700/70 bg-ink-950/85 px-5 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        {finishError && (
          <p className="mb-2 text-[13px] text-danger">{finishError}</p>
        )}
        <div className="flex gap-2.5">
          <button
            onClick={() => setConfirmDiscard(true)}
            className="press rounded-xl border border-ink-700 px-4 py-3 text-[15px] font-medium text-ink-300"
          >
            Descartar
          </button>
          <button
            onClick={handleFinish}
            className="press flex-1 rounded-xl bg-volt-500 py-3 text-[15px] font-bold text-ink-950"
          >
            Terminar entrenamiento
          </button>
        </div>
      </footer>

      {confirmDiscard && (
        <ConfirmDialog
          title="Descartar entrenamiento"
          message="Se perderán todos los ejercicios y series de este entrenamiento. Esta acción no se puede deshacer."
          confirmLabel="Descartar"
          onConfirm={discardWorkout}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  )
}
