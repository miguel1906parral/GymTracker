import { db } from './db.js'

// ─────────────────────────────────────────────────────────────────────────
// Consultas de solo lectura para "Mi perfil" y para la referencia "última vez".
//
// Nada de esto se guarda aparte: el historial, el conteo del mes y los récords
// se DERIVAN de la tabla `sets` cada vez. La única fuente de verdad son las
// series que registraste; si borras un entrenamiento, su récord desaparece solo
// porque deja de existir la serie que lo sostenía. No hay un contador que
// mantener sincronizado a mano.
// ─────────────────────────────────────────────────────────────────────────

// 1RM estimado con la fórmula de Epley: peso × (1 + repeticiones/30).
//
// OJO — es una ESTIMACIÓN, no una medición. La fórmula supone que la relación
// entre el peso y las repeticiones es lineal, y eso solo se cumple de forma
// aproximada a pocas repeticiones (~1-10). Una serie de 5×100 estima ~117 kg y
// es bastante fiable; una de 20×60 estima ~100 kg y ahí Epley SOBREESTIMA. Sirve
// para comparar tu progreso contigo mismo a lo largo del tiempo, no como el peso
// exacto que levantarías una sola vez.
export function epley1RM(weight, reps) {
  return weight * (1 + reps / 30)
}

// ¿Es esta fecha (ISO) del mismo mes y año que `ref`?
function sameMonth(iso, ref) {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

// Carga TODO lo que necesita la pantalla de perfil en una sola pasada. Se llama
// dentro de un useLiveQuery, así que Dexie la reejecuta sola cuando cambian las
// tablas que lee (workouts, workoutExercises, sets, exercises).
export async function loadProfile() {
  // Solo cuentan los entrenamientos TERMINADOS. El que está en curso ('active')
  // todavía no es historia, así que se queda fuera del conteo y de los récords.
  const done = await db.workouts.where('status').equals('done').toArray()
  // Del más reciente al más antiguo. Uso finishedAt (cuándo lo cerraste) y caigo
  // a startedAt por si algún registro viejo no lo tuviera. Las cadenas ISO se
  // ordenan alfabéticamente igual que cronológicamente, así que localeCompare
  // basta y no hace falta convertir a Date.
  done.sort((a, b) =>
    (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt),
  )
  const doneIds = new Set(done.map((w) => w.id))

  // Traigo todos los enlaces y series de una vez y los cruzo en memoria. Sin
  // JOINs en IndexedDB, para una app personal (cientos de series, no millones)
  // esto es más simple y rápido que lanzar una consulta por entrenamiento.
  const allLinks = await db.workoutExercises.toArray()
  const allSets = await db.sets.toArray()
  // Descarta las series del entrenamiento en curso: aún no son historial.
  const sets = allSets.filter((s) => doneIds.has(s.workoutId))

  // ── 1) Conteo del mes actual y del anterior (para la comparación) ──────────
  const now = new Date()
  const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  let monthCount = 0
  let prevMonthCount = 0
  for (const w of done) {
    const when = w.finishedAt ?? w.startedAt
    if (sameMonth(when, now)) monthCount++
    else if (sameMonth(when, prevMonthRef)) prevMonthCount++
  }

  // ── 2) Historial: por entrenamiento, nº de ejercicios y de series ──────────
  const exCount = new Map() // workoutId -> nº de ejercicios
  for (const l of allLinks) {
    if (!doneIds.has(l.workoutId)) continue
    exCount.set(l.workoutId, (exCount.get(l.workoutId) ?? 0) + 1)
  }
  const setCount = new Map() // workoutId -> nº de series
  for (const s of sets) {
    setCount.set(s.workoutId, (setCount.get(s.workoutId) ?? 0) + 1)
  }
  const history = done.map((w) => ({
    id: w.id,
    date: w.finishedAt ?? w.startedAt,
    name: w.name, // copia del nombre de la rutina; null si fue libre
    exerciseCount: exCount.get(w.id) ?? 0,
    setCount: setCount.get(w.id) ?? 0,
  }))

  // ── 3) Récords: por ejercicio, peso máximo y mejor 1RM estimado ────────────
  // Recorro las series una vez y me quedo, por ejercicio, con el peso más alto y
  // con la serie que da el mejor 1RM estimado (que no tiene por qué ser la del
  // peso máximo: 5×100 estima más que 1×105).
  const byExercise = new Map()
  for (const s of sets) {
    let r = byExercise.get(s.exerciseId)
    if (!r) {
      r = { maxWeight: -Infinity, best1RM: -Infinity, bestSet: null, lastAt: '' }
      byExercise.set(s.exerciseId, r)
    }
    if (s.weight > r.maxWeight) r.maxWeight = s.weight
    const oneRm = epley1RM(s.weight, s.reps)
    if (oneRm > r.best1RM) {
      r.best1RM = oneRm
      r.bestSet = s
    }
    const at = s.performedAt ?? ''
    if (at > r.lastAt) r.lastAt = at
  }

  // Los nombres viven en el catálogo (otra tabla): los uno aquí con un bulkGet.
  const ids = [...byExercise.keys()]
  const catalog = await db.exercises.bulkGet(ids)
  const records = ids.map((id, i) => {
    const r = byExercise.get(id)
    return {
      exerciseId: id,
      name: catalog[i]?.name ?? id,
      nameEs: catalog[i]?.nameEs ?? null,
      maxWeight: r.maxWeight,
      best1RM: r.best1RM,
      bestReps: r.bestSet.reps,
      bestWeight: r.bestSet.weight,
      lastAt: r.lastAt,
    }
  })
  // Orden útil: lo más recientemente entrenado arriba (por `lastAt`, la fecha de
  // la última serie de cada ejercicio). Así ves primero lo que estás trabajando
  // ahora. `lastAt` es una cadena ISO, y esas se ordenan alfabéticamente igual
  // que cronológicamente. Si prefirieras "el más fuerte arriba", bastaría con
  // ordenar por b.best1RM - a.best1RM en su lugar.
  records.sort((a, b) => b.lastAt.localeCompare(a.lastAt))

  return { monthCount, prevMonthCount, history, records }
}

// Detalle de un entrenamiento concreto: sus ejercicios (en orden) y todas las
// series de cada uno. Se llama al tocar un elemento del historial.
export async function loadWorkoutDetail(workoutId) {
  const workout = await db.workouts.get(workoutId)
  if (!workout) return null

  const links = await db.workoutExercises
    .where('workoutId')
    .equals(workoutId)
    .sortBy('order')
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
  const catalog = await db.exercises.bulkGet(links.map((l) => l.exerciseId))

  return {
    workout,
    exercises: links.map((link, i) => ({
      link,
      exercise: catalog[i] ?? null,
      sets: sets
        .filter((s) => s.workoutExerciseId === link.id)
        .sort((a, b) => a.setNumber - b.setNumber),
    })),
  }
}

// Referencia "última vez" para el entrenamiento en curso: busca la sesión
// TERMINADA más reciente (distinta de la actual) que contenga al menos una serie
// de este ejercicio, y devuelve esas series. Solo LEE; no cambia nada guardado.
//
// Clave del enunciado: si en la última sesión salté este ejercicio, hay que
// seguir buscando hacia atrás. Eso sale gratis agrupando por sesión y quedándose
// con la más reciente que SÍ aparezca: las sesiones donde no lo hice ni siquiera
// están en el grupo.
export async function lastTimeForExercise(exerciseId, currentWorkoutId) {
  const mine = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const others = mine.filter((s) => s.workoutId !== currentWorkoutId)
  if (others.length === 0) return null // primera vez que hago este ejercicio

  // Agrupo las series por la sesión a la que pertenecen.
  const byWorkout = new Map()
  for (const s of others) {
    if (!byWorkout.has(s.workoutId)) byWorkout.set(s.workoutId, [])
    byWorkout.get(s.workoutId).push(s)
  }

  // De esas sesiones, me quedo con las TERMINADAS y elijo la más reciente. Filtro
  // por status por seguridad, aunque en la práctica solo hay un entrenamiento
  // activo (el actual, ya excluido) y los descartados se borran enteros.
  const workouts = await db.workouts.bulkGet([...byWorkout.keys()])
  const candidates = workouts
    .filter((w) => w && w.status === 'done')
    .sort((a, b) =>
      (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt),
    )
  if (candidates.length === 0) return null

  const latest = candidates[0]
  const latestSets = byWorkout
    .get(latest.id)
    .sort((a, b) => a.setNumber - b.setNumber)
  return {
    workoutId: latest.id,
    date: latest.finishedAt ?? latest.startedAt,
    sets: latestSets.map((s) => ({ reps: s.reps, weight: s.weight })),
  }
}
