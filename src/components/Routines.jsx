import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  listRoutines,
  deleteRoutine,
  startWorkoutFromRoutine,
} from '../routines.js'
import ConfirmDialog from './ConfirmDialog'
import RoutineEditor from './RoutineEditor'
import Screen from './Screen'

function RoutineCard({ routine, onEmpezar, onBorrar, indice }) {
  return (
    <li
      className="animate-fade-up rounded-2xl border border-ink-700/60 bg-ink-900 p-4"
      // Escalonado: cada tarjeta entra 40 ms después de la anterior. Es
      // decorativo y corto; con retardos largos la app parecería lenta.
      style={{ animationDelay: `${Math.min(indice, 6) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] leading-tight font-semibold text-ink-100">
            {routine.name}
          </h3>
          {routine.notes && (
            <p className="mt-1 text-[13px] leading-snug text-ink-400">
              {routine.notes}
            </p>
          )}
        </div>
        <button
          onClick={onBorrar}
          className="press shrink-0 rounded-md px-2 py-1 text-[13px] text-ink-400 active:text-danger"
          aria-label={`Borrar ${routine.name}`}
        >
          Borrar
        </button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {routine.exercises.map(({ link, exercise }) => (
          <li key={link.id} className="flex items-baseline gap-2.5">
            <span className="tnum shrink-0 text-[11px] font-bold text-volt-500">
              {String(link.order + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink-100">
              {exercise?.name ?? link.exerciseId}
              {exercise?.nameEs && (
                <span className="block text-[12px] text-ink-400">
                  {exercise.nameEs}
                </span>
              )}
            </span>
            {link.targetSets && (
              <span className="tnum shrink-0 text-[12px] font-medium text-ink-300">
                {link.targetSets} ×{' '}
                {link.targetRepsMin === link.targetRepsMax
                  ? link.targetRepsMin
                  : `${link.targetRepsMin}-${link.targetRepsMax}`}
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={onEmpezar}
        className="press mt-3.5 w-full rounded-xl bg-volt-500 py-2.5 text-[14px] font-bold text-ink-950"
      >
        Empezar
      </button>
    </li>
  )
}

export default function Routines({ onEmpezada }) {
  const [creando, setCreando] = useState(false)
  const [borrando, setBorrando] = useState(null)
  const [error, setError] = useState(null)

  // Se relee sola cuando cambian las tablas que toca. `db.exercises` entra en la
  // consulta a través de listRoutines, así que Dexie también la vigila.
  const routines = useLiveQuery(() => listRoutines(), [])

  if (creando) {
    return (
      <RoutineEditor
        onCancel={() => setCreando(false)}
        onSaved={() => setCreando(false)}
      />
    )
  }

  async function empezar(routineId) {
    const r = await startWorkoutFromRoutine(routineId)
    if (!r.ok) {
      setError(r.error)
      return
    }
    onEmpezada()
  }

  return (
    <Screen
      title="Mis rutinas"
      action={
        <button
          onClick={() => setCreando(true)}
          className="press rounded-full bg-volt-500 px-3.5 py-1.5 text-[13px] font-bold text-ink-950"
        >
          + Nueva
        </button>
      }
    >
      {error && <p className="mb-2 px-5 text-[13px] text-danger">{error}</p>}

      {routines === undefined && (
        <p className="px-5 text-sm text-ink-400">Cargando…</p>
      )}

      {routines?.length === 0 && (
        <div className="px-8 py-16 text-center">
          <p className="text-[15px] font-medium text-ink-100">
            Todavía no tienes rutinas.
          </p>
          <p className="mt-1.5 text-sm text-ink-400">
            Una rutina es una plantilla que reutilizas: «Día de empuje»,
            «Pierna»…
          </p>
        </div>
      )}

      <ul className="space-y-2.5 px-5">
        {routines?.map((r, i) => (
          <RoutineCard
            key={r.id}
            routine={r}
            indice={i}
            onEmpezar={() => empezar(r.id)}
            onBorrar={() => setBorrando(r)}
          />
        ))}
      </ul>

      {borrando && (
        <ConfirmDialog
          title={`Borrar «${borrando.name}»`}
          message="Se borra la plantilla, no los entrenamientos que ya hiciste con ella."
          confirmLabel="Borrar"
          onConfirm={async () => {
            await deleteRoutine(borrando.id)
            setBorrando(null)
          }}
          onCancel={() => setBorrando(null)}
        />
      )}
    </Screen>
  )
}
