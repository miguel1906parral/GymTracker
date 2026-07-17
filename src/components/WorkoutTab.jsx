import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useWorkouts } from '../context/WorkoutContext'
import { daysSinceLastWorkout, pickPhrase } from '../motivation.js'
import ActiveWorkout from './ActiveWorkout'
import ExerciseSearch from './ExerciseSearch'
import Screen from './Screen'

function SinEntrenamiento({ onEmpezar, onExplorar, onVerRutinas }) {
  // `undefined` = todavía cargando; `null` = nunca has terminado ninguno.
  const dias = useLiveQuery(() => daysSinceLastWorkout(), [])
  // La frase rota en cada visita, no en cada render: con Date.now() en el
  // render, cualquier cambio de estado la cambiaría delante de tus narices.
  const [semilla, setSemilla] = useState(() => Date.now() / 1000)

  // Rotación lenta: cada 8 s pasa a la siguiente frase del tramo.
  useEffect(() => {
    const t = setInterval(() => setSemilla((s) => s + 1), 8000)
    return () => clearInterval(t)
  }, [])

  const frase = dias === undefined ? null : pickPhrase(dias, semilla)

  return (
    <Screen title="Entrenar">
      <div className="flex flex-col gap-6 px-5 pt-6">
        <div className="min-h-[7.5rem]">
          {dias !== undefined && dias !== null && dias > 0 && (
            <div className="mb-3 flex items-baseline gap-2">
              {/* El número, grande y en el color de acento: es el dato, y el
                  resto de la frase es su contexto. */}
              <span className="tnum text-[56px] leading-none font-bold tracking-tight text-volt-500">
                {dias}
              </span>
              <span className="max-w-[5rem] text-[13px] leading-tight font-medium tracking-wide text-ink-400 uppercase">
                {dias === 1 ? 'día sin entrenar' : 'días sin entrenar'}
              </span>
            </div>
          )}
          {frase && (
            // `key` fuerza a React a montar un <p> nuevo al cambiar la frase, y
            // eso vuelve a disparar la animación de entrada. Sin key, React
            // reutilizaría el nodo y el texto cambiaría de golpe.
            <p
              key={frase}
              className="animate-fade-up text-[22px] leading-tight font-semibold text-balance text-ink-100"
            >
              {frase}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onVerRutinas}
            className="press w-full rounded-2xl bg-volt-500 py-4 text-[15px] font-bold text-ink-950"
          >
            Empezar desde una rutina
          </button>
          <button
            onClick={onEmpezar}
            className="press w-full rounded-2xl border border-ink-700 py-4 text-[15px] font-medium text-ink-300"
          >
            Entrenamiento libre
          </button>
          <button
            onClick={onExplorar}
            className="press w-full rounded-2xl border border-ink-700 py-4 text-[15px] font-medium text-ink-300"
          >
            Explorar el catálogo
          </button>
        </div>
      </div>
    </Screen>
  )
}

export default function WorkoutTab({ onVerRutinas }) {
  const { loading, active, startWorkout } = useWorkouts()
  const [explorando, setExplorando] = useState(false)

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-sm text-ink-400">Cargando…</p>
      </div>
    )
  }

  if (explorando) {
    return (
      <div className="flex h-dvh flex-col">
        <header className="flex shrink-0 items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <h1 className="text-[27px] leading-none font-bold">Catálogo</h1>
          <button
            onClick={() => setExplorando(false)}
            className="press text-[15px] font-medium text-ink-400"
          >
            Cerrar
          </button>
        </header>
        <ExerciseSearch />
      </div>
    )
  }

  if (active) return <ActiveWorkout />

  return (
    <SinEntrenamiento
      onEmpezar={startWorkout}
      onExplorar={() => setExplorando(true)}
      onVerRutinas={onVerRutinas}
    />
  )
}
