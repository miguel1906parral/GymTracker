import { db } from './db.js'
import { normalizeName } from './normalize.js'

// Por qué el buscador NO usa un índice de IndexedDB:
//
// Un índice de IndexedDB es una lista ordenada, como el índice de un libro. Sirve
// para "empieza por..." o "está entre X e Y", pero NO para "contiene...". Buscar
// "sentadilla" dentro de "barra sentadilla frontal" es una búsqueda por
// subcadena, y para eso ningún índice ayuda: hay que mirar los 1.324, uno a uno.
//
// Así que el trabajo se hace en memoria. Se leen los ejercicios de IndexedDB una
// sola vez y se guarda una copia reducida (sin instrucciones, que son el 90% del
// peso). A partir de ahí cada búsqueda recorre un array pequeño, sin volver a
// tocar la base de datos: si no, cada tecla pulsada releería ~2 MB del disco del
// móvil.
let index = null

export function invalidateSearchIndex() {
  index = null
}

async function getIndex() {
  if (index) return index
  const all = await db.exercises.toArray()
  index = all.map((e) => ({
    id: e.id,
    name: e.name,
    nameEs: e.nameEs,
    target: e.target,
    bodyPart: e.bodyPart,
    equipment: e.equipment,
    // Los dos campos contra los que se compara, ya normalizados por
    // build-catalog con la misma función que usa la consulta. Se guardan por
    // separado (y no concatenados) para poder detectar si la búsqueda coincide
    // con el PRINCIPIO de cualquiera de los dos nombres, no solo del inglés.
    en: e.nameNormalized ?? '',
    es: e.nameEsNormalized ?? '',
  }))
  return index
}

/**
 * Busca en el nombre inglés y en el español a la vez.
 *
 * La consulta se normaliza con la MISMA función que usó build-catalog para
 * generar los campos guardados (src/normalize.js). Eso es lo que hace que
 * "SENTADILLA", "sentadilla" y "Sentadílla" encuentren lo mismo: los dos lados
 * de la comparación pasan por el mismo filtro. Si cada lado normalizara a su
 * manera, dejarían de coincidir.
 *
 * Con varias palabras exige que estén TODAS (pero en cualquier orden), así
 * "sentadilla barra" acota en lugar de devolver de más.
 */
export async function searchExercises(query, { limit = 50 } = {}) {
  const idx = await getIndex()
  const q = normalizeName(query ?? '')
  if (!q) return { total: idx.length, results: idx.slice(0, limit) }

  const terms = q.split(/\s+/).filter(Boolean)
  // Cada palabra puede casar en el nombre inglés O en el español, y no hace
  // falta que todas casen en el mismo: "sentadilla smith" funciona aunque
  // "smith" venga del nombre inglés y "sentadilla" del español.
  const hits = idx.filter((e) =>
    terms.every((t) => e.en.includes(t) || e.es.includes(t)),
  )

  // Primero lo que empieza por lo que has escrito, en cualquiera de los dos
  // idiomas: al buscar "press", "press de banca" es más útil que "sentadilla
  // con press por encima".
  const startsWithQuery = (e) =>
    e.en.startsWith(terms[0]) || e.es.startsWith(terms[0]) ? 0 : 1
  hits.sort((a, b) => {
    const diff = startsWithQuery(a) - startsWithQuery(b)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })

  return { total: hits.length, results: hits.slice(0, limit) }
}
