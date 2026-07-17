import { db } from './db.js'

/**
 * Días desde el último entrenamiento COMPLETADO.
 *
 * Se calcula, no se guarda: un dato así caduca solo con que pase el tiempo, y
 * guardarlo obligaría a mantenerlo al día. Devuelve null si nunca has terminado
 * ninguno, que no es lo mismo que "0 días" y merece otro mensaje.
 */
export async function daysSinceLastWorkout(hoy = new Date()) {
  // sortBy ordena ascendente, así que el último del array es el más reciente.
  // (Encadenar .reverse() antes de .sortBy() no es fiable en Dexie: el orden en
  // que se aplican no es evidente. Mejor tomar el último y no depender de eso.)
  const hechos = await db.workouts.where('status').equals('done').sortBy('date')
  if (hechos.length === 0) return null
  const ultimo = hechos[hechos.length - 1]

  // Se compara a mediodía para que el cambio de hora no desplace un día entero.
  const aMediodia = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  const [y, m, d] = ultimo.date.split('-').map(Number)
  const diff = aMediodia(hoy) - aMediodia(new Date(y, m - 1, d))
  return Math.max(0, Math.round(diff / 86400000))
}

// Las frases se eligen por tramos: lo que es gracioso el primer día ("¿ya de
// vuelta?") sería absurdo tras tres semanas. `{d}` se sustituye por los días.
const FRASES = {
  nunca: [
    'Todo empieza por la primera serie. Vamos.',
    'Cero entrenamientos. El listón está bajito, es fácil superarlo.',
    'Aquí no hay excusas todavía, porque no hay historial.',
  ],
  hoy: [
    '¿Otra vez? Eso ya es vicio. Me gusta.',
    'Hoy ya has entrenado, campeón. ¿Repetimos?',
    'Dos en un día. Alguien tiene algo que demostrar.',
  ],
  reciente: [
    'Ayer tocó hierro. Hoy toca decidir.',
    'Vas bien. No lo estropees ahora.',
    'Un día de descanso es descanso. Dos ya es una decisión.',
  ],
  medio: [
    '{d} días de descanso. El hierro no se levanta solo.',
    'Llevas {d} días. Las mancuernas preguntan por ti.',
    '{d} días fuera. Nada roto todavía, pero vamos a arreglarlo.',
  ],
  largo: [
    '{d} días. ¿Te da pereza el gimnasio o qué?',
    'Llevas {d} días de descanso. ¡Toca hierro!',
    '{d} días. Tu yo del mes pasado te está mirando raro.',
    '{d} días sin entrenar. Esto ya no es descanso, es una relación a distancia.',
  ],
}

function tramo(dias) {
  if (dias === null) return 'nunca'
  if (dias === 0) return 'hoy'
  if (dias <= 2) return 'reciente'
  if (dias <= 6) return 'medio'
  return 'largo'
}

/**
 * Elige una frase para los días dados. `semilla` permite rotar entre las frases
 * del tramo sin repetir siempre la misma.
 */
export function pickPhrase(dias, semilla = Date.now()) {
  const opciones = FRASES[tramo(dias)]
  const frase = opciones[Math.abs(Math.floor(semilla)) % opciones.length]
  return frase.replace('{d}', String(dias))
}

export const PHRASE_GROUPS = FRASES
