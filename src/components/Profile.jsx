import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadProfile, loadWorkoutDetail } from '../stats.js'
import { formatDate, formatTime, formatWeight } from '../format'
import { useCountUp } from '../useCountUp.js'
import Screen from './Screen'

// Nombre del mes actual y del anterior, para la tarjeta destacada.
const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long' })
const thisMonthName = monthFmt.format(new Date())
const prevMonthName = monthFmt.format(
  new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
)

// Redondea el 1RM estimado a un decimal para no enseñar cifras falsamente
// precisas (117,3333 kg no significa nada; 117,3 ya es generoso para una
// estimación).
function round1(n) {
  return Math.round(n * 10) / 10
}

// ── Tarjeta destacada: entrenamientos de este mes ───────────────────────────
function MonthHero({ count, prevCount }) {
  const shown = useCountUp(count, { duration: 1000 })
  const delta = count - prevCount

  // La comparación con el mes pasado da carácter con un dato REAL, no decorado.
  let comparison
  if (prevCount === 0) {
    comparison =
      count > 0 ? 'Tu primer mes con registros. A por ello.' : null
  } else if (delta > 0) {
    comparison = `${delta} más que en ${prevMonthName}`
  } else if (delta < 0) {
    comparison = `${Math.abs(delta)} menos que en ${prevMonthName}`
  } else {
    comparison = `Igual que en ${prevMonthName}`
  }

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-ink-700/60 bg-ink-900 p-5">
      {/* Resplandor volt muy tenue en una esquina: da profundidad y "enciende"
          la tarjeta sin que el color compita con el número. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-volt-500/10 blur-2xl"
      />
      <p className="text-[11px] font-bold tracking-[0.12em] text-ink-400 uppercase">
        Entrenamientos · {thisMonthName}
      </p>
      <div className="mt-2 flex items-baseline gap-2.5">
        <span className="tnum text-[64px] leading-none font-bold tracking-tight text-volt-500">
          {shown}
        </span>
        <span className="text-[15px] font-medium text-ink-300">
          {count === 1 ? 'sesión' : 'sesiones'}
        </span>
      </div>
      {comparison && (
        <div className="mt-3 flex items-center gap-1.5">
          {delta !== 0 && prevCount > 0 && (
            <span
              className={`text-[13px] ${delta > 0 ? 'text-volt-500' : 'text-ink-400'}`}
              aria-hidden="true"
            >
              {delta > 0 ? '▲' : '▼'}
            </span>
          )}
          <span className="text-[13px] text-ink-400">{comparison}</span>
        </div>
      )}
    </div>
  )
}

// ── Una tarjeta de récord ───────────────────────────────────────────────────
function RecordCard({ record, rank }) {
  // El 1RM cuenta hacia arriba con un decimal: es el número que da "personalidad"
  // a la tarjeta, así que merece el mismo trato que el dato del héroe.
  const oneRm = useCountUp(round1(record.best1RM), {
    duration: 800,
    decimals: 1,
  })
  const nombre = record.nameEs || record.name
  const reciente = rank === 0 // el entrenado más recientemente lleva el acento

  return (
    <div
      className="animate-fade-up flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-900 p-4"
      style={{ animationDelay: `${Math.min(rank, 8) * 40}ms` }}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          reciente
            ? 'bg-volt-500 text-ink-950'
            : 'bg-ink-800 text-ink-400 ring-1 ring-ink-700'
        }`}
      >
        {/* Mancuerna: da carácter y ritmo a la lista sin implicar un ranking por
            número (los récords van ordenados por recencia, no por fuerza). */}
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold text-ink-100">
          {nombre}
        </h3>
        <p className="tnum mt-0.5 text-[12px] text-ink-400">
          Mejor serie: {record.bestReps} × {formatWeight(record.bestWeight)} kg
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div className="tnum text-[19px] leading-none font-bold text-ink-100">
          {formatWeight(record.maxWeight)}
          <span className="ml-0.5 text-[12px] font-normal text-ink-400">kg</span>
        </div>
        {/* 1RM estimado: secundario, en su propia "pill" para que se lea como un
            dato aparte y no se confunda con el peso máximo real. */}
        <div className="tnum mt-1.5 inline-flex items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-volt-500">
          1RM ~{formatWeight(oneRm)}
        </div>
      </div>
    </div>
  )
}

// ── Un elemento del historial ───────────────────────────────────────────────
function HistoryRow({ item, onOpen, index }) {
  return (
    <button
      onClick={() => onOpen(item.id)}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="press animate-fade-up flex w-full items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-900 p-4 text-left"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-ink-100">
            {item.name ?? 'Entrenamiento libre'}
          </span>
        </div>
        <p className="tnum mt-0.5 text-[12px] text-ink-400">
          {formatDate(item.date)} · {item.exerciseCount}{' '}
          {item.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
          {item.setCount} {item.setCount === 1 ? 'serie' : 'series'}
        </p>
      </div>
      <span className="shrink-0 text-[20px] leading-none text-ink-600" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

// ── Vista de detalle de un entrenamiento ────────────────────────────────────
function WorkoutDetail({ workoutId, onBack }) {
  const detail = useLiveQuery(() => loadWorkoutDetail(workoutId), [workoutId])

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button
          onClick={onBack}
          className="press -ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[15px] font-medium text-ink-400"
          aria-label="Volver al perfil"
        >
          <span className="text-[20px] leading-none">‹</span> Perfil
        </button>
      </header>

      <main className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-28">
        {detail === undefined && (
          <p className="py-12 text-center text-sm text-ink-400">Cargando…</p>
        )}
        {detail && (
          <>
            <div className="mb-1">
              <h1 className="text-[24px] leading-tight font-bold text-ink-100">
                {detail.workout.name ?? 'Entrenamiento libre'}
              </h1>
              <p className="tnum mt-1 text-[13px] text-ink-400">
                {formatDate(detail.workout.finishedAt ?? detail.workout.startedAt)}
                {detail.workout.finishedAt &&
                  ` · ${formatTime(detail.workout.finishedAt)}`}
              </p>
            </div>

            {detail.exercises.map((ex, i) => (
              <div
                key={ex.link.id}
                className="rounded-2xl border border-ink-700/60 bg-ink-900 p-4"
              >
                <div className="flex items-baseline gap-2">
                  <span className="tnum text-[11px] font-bold text-volt-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink-100">
                    {ex.exercise?.name ?? ex.link.exerciseId}
                  </h3>
                </div>
                <ul className="mt-3 space-y-1">
                  {ex.sets.map((set) => (
                    <li
                      key={set.id}
                      className="flex items-center gap-3 rounded-lg bg-ink-850 px-3 py-2"
                    >
                      <span className="tnum w-4 text-[12px] font-semibold text-ink-400">
                        {set.setNumber}
                      </span>
                      <span className="tnum text-[15px] font-semibold text-ink-100">
                        {set.reps}
                        <span className="mx-1.5 font-normal text-ink-400">×</span>
                        {formatWeight(set.weight)}
                        <span className="ml-1 text-[12px] font-normal text-ink-400">
                          kg
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}

// ── Estado vacío amable ─────────────────────────────────────────────────────
function EmptyProfile() {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 ring-1 ring-ink-700">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-ink-400" aria-hidden="true">
          <path
            d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-ink-100">
        Aún no hay entrenamientos
      </p>
      <p className="mt-1.5 max-w-[16rem] text-sm text-ink-400">
        Cuando termines tu primer entrenamiento, aquí verás tu conteo del mes, tu
        historial y tus récords.
      </p>
    </div>
  )
}

function SectionTitle({ children, count }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2 px-1">
      <h2 className="text-[13px] font-bold tracking-[0.08em] text-ink-300 uppercase">
        {children}
      </h2>
      {count != null && (
        <span className="tnum text-[13px] font-medium text-ink-400">{count}</span>
      )}
    </div>
  )
}

export default function Profile() {
  const data = useLiveQuery(() => loadProfile(), [])
  const [openId, setOpenId] = useState(null)

  if (openId != null) {
    return <WorkoutDetail workoutId={openId} onBack={() => setOpenId(null)} />
  }

  if (data === undefined) {
    return (
      <Screen title="Mi perfil">
        <p className="px-5 py-12 text-center text-sm text-ink-400">Cargando…</p>
      </Screen>
    )
  }

  const { monthCount, prevMonthCount, history, records } = data
  const vacio = history.length === 0

  return (
    <Screen title="Mi perfil">
      {vacio ? (
        <EmptyProfile />
      ) : (
        <div className="space-y-8 px-5 pt-2">
          <MonthHero count={monthCount} prevCount={prevMonthCount} />

          {records.length > 0 && (
            <section>
              <SectionTitle count={records.length}>Récords</SectionTitle>
              <div className="space-y-2">
                {records.map((r, i) => (
                  <RecordCard key={r.exerciseId} record={r} rank={i} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle count={history.length}>Historial</SectionTitle>
            <div className="space-y-2">
              {history.map((item, i) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  index={i}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </Screen>
  )
}
