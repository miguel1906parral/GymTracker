import { useState } from 'react'
import { saveRoutine } from '../routines.js'
import ExerciseSearch from './ExerciseSearch'

function CampoObjetivo({ valor, onChange, placeholder, etiqueta }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min="1"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={etiqueta}
      className="tnum w-12 rounded-md border border-ink-700 bg-ink-800 px-1 py-1.5 text-center text-[13px] text-ink-100 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none"
    />
  )
}

export default function RoutineEditor({ onCancel, onSaved }) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState([])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  function actualizar(idx, campo, valor) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === idx
          ? { ...e, [campo]: valor === '' ? null : Number.parseInt(valor, 10) }
          : e,
      ),
    )
  }

  async function guardar() {
    if (!name.trim()) {
      setError('Ponle un nombre a la rutina.')
      return
    }
    if (exercises.length === 0) {
      setError('Añade al menos un ejercicio.')
      return
    }
    setGuardando(true)
    // Si solo indicas un número de repeticiones, min y max son el mismo: el
    // esquema guarda un rango (8-12), y un valor fijo es un rango de uno.
    await saveRoutine({
      name: name.trim(),
      notes: notes.trim(),
      exercises: exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax ?? e.targetRepsMin,
      })),
    })
    onSaved()
  }

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
          onPick={(e) => {
            setExercises((prev) => [
              ...prev,
              {
                exerciseId: e.id,
                name: e.name,
                nameEs: e.nameEs,
                targetSets: null,
                targetRepsMin: null,
                targetRepsMax: null,
              },
            ])
            setPicking(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <h1 className="text-[27px] leading-none font-bold">Nueva rutina</h1>
        <button
          onClick={onCancel}
          className="press text-[15px] font-medium text-ink-400"
        >
          Cancelar
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-40">
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (ej. Día de empuje)"
            aria-label="Nombre de la rutina"
            className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-3 text-base text-ink-100 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota (opcional)"
            aria-label="Nota"
            rows={2}
            className="w-full resize-none rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-3 text-[15px] text-ink-100 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none"
          />
        </div>

        <div>
          <h2 className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-400 uppercase">
            Ejercicios
          </h2>
          <ul className="space-y-2">
            {exercises.map((e, i) => (
              <li
                key={`${e.exerciseId}-${i}`}
                className="rounded-2xl border border-ink-700/60 bg-ink-900 p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] leading-tight font-medium text-ink-100">
                      {e.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-400">
                      {e.nameEs}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setExercises((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="press shrink-0 rounded-md px-2 py-1 text-[13px] text-ink-400 active:text-danger"
                    aria-label={`Quitar ${e.name}`}
                  >
                    Quitar
                  </button>
                </div>
                {/* Objetivos opcionales: el control va justo al lado de lo que
                    afecta, no en otra pantalla. */}
                <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-ink-400">
                  <CampoObjetivo
                    valor={e.targetSets}
                    onChange={(v) => actualizar(i, 'targetSets', v)}
                    placeholder="4"
                    etiqueta={`Series objetivo de ${e.name}`}
                  />
                  <span>series ×</span>
                  <CampoObjetivo
                    valor={e.targetRepsMin}
                    onChange={(v) => actualizar(i, 'targetRepsMin', v)}
                    placeholder="8"
                    etiqueta={`Repeticiones mínimas de ${e.name}`}
                  />
                  <span>-</span>
                  <CampoObjetivo
                    valor={e.targetRepsMax}
                    onChange={(v) => actualizar(i, 'targetRepsMax', v)}
                    placeholder="12"
                    etiqueta={`Repeticiones máximas de ${e.name}`}
                  />
                  <span>reps</span>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setPicking(true)}
            className="press mt-2 w-full rounded-2xl border border-dashed border-ink-700 py-3.5 text-[15px] font-medium text-ink-300 active:border-ink-600"
          >
            + Añadir ejercicio
          </button>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-700/70 bg-ink-950/85 px-5 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        {error && <p className="mb-2 text-[13px] text-danger">{error}</p>}
        <button
          onClick={guardar}
          disabled={guardando}
          className="press w-full rounded-xl bg-volt-500 py-3.5 text-[15px] font-bold text-ink-950 disabled:opacity-50"
        >
          Guardar rutina
        </button>
      </footer>
    </div>
  )
}
