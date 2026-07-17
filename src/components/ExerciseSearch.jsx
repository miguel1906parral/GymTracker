import { useEffect, useRef, useState } from 'react'
import { searchExercises } from '../search.js'

/**
 * Buscador del catálogo. Se usa en tres sitios con el mismo código:
 *  - explorando el catálogo (sin `onPick`);
 *  - eligiendo ejercicio para el entrenamiento en curso;
 *  - eligiendo ejercicio al montar una rutina.
 */
export default function ExerciseSearch({ onPick, autoFocus = false }) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ total: 0, results: [], loading: true })
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    let cancelado = false
    // Esperar 150 ms desde la última tecla en vez de buscar en cada pulsación:
    // escribiendo "sentadilla" se harían 10 búsquedas y solo importa la última.
    const t = setTimeout(async () => {
      const r = await searchExercises(query)
      // Al escribir rápido puede haber varias búsquedas en vuelo y no tienen por
      // qué terminar en orden. Sin esta guarda, una búsqueda vieja que acaba
      // tarde podría pisar los resultados de la nueva.
      if (!cancelado) setState({ ...r, loading: false })
    }, 150)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-5 pb-3">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="sentadilla, pecho, mancuerna…"
            className="w-full rounded-xl border border-ink-700 bg-ink-800 py-2.5 pr-3 pl-10 text-base text-ink-100 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none"
          />
        </div>
        {!state.loading && (
          <p className="tnum mt-2 px-0.5 text-[11px] text-ink-400">
            {state.total} {state.total === 1 ? 'ejercicio' : 'ejercicios'}
            {state.total > state.results.length &&
              ` · mostrando ${state.results.length}`}
          </p>
        )}
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 pb-4">
        {state.results.map((e) => {
          const Fila = onPick ? 'button' : 'div'
          return (
            <li key={e.id}>
              <Fila
                {...(onPick
                  ? { onClick: () => onPick(e), type: 'button' }
                  : {})}
                className={`block w-full rounded-xl border border-ink-700/60 bg-ink-900 px-3.5 py-3 text-left ${
                  onPick ? 'press active:border-ink-600' : ''
                }`}
              >
                {/* El nombre en español se genera palabra a palabra y no es
                    gramatical, así que manda el inglés (el real del catálogo) y
                    el español va debajo, como ayuda de búsqueda. */}
                <span className="block text-[15px] leading-tight font-medium text-ink-100">
                  {e.name}
                </span>
                <span className="mt-1 block text-[13px] leading-tight text-ink-400">
                  {e.nameEs}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {[e.target, e.equipment].filter(Boolean).map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-ink-800 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-ink-300 uppercase"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              </Fila>
            </li>
          )
        })}

        {!state.loading && state.total === 0 && (
          <li className="py-12 text-center text-sm text-ink-400">
            Ningún ejercicio coincide con «{query}».
          </li>
        )}
      </ul>
    </div>
  )
}
