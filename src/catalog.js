import { db } from './db.js'
import { invalidateSearchIndex } from './search.js'

const CATALOG_KEY = 'catalog'

// El fichero lo genera scripts/build-catalog.mjs y se sirve desde public/.
// BASE_URL (en vez de '/exercises.json') mantiene la ruta correcta si la app se
// publica algún día en un subdirectorio.
async function fetchCatalog() {
  const res = await fetch(`${import.meta.env.BASE_URL}exercises.json`)
  if (!res.ok) {
    throw new Error(`No se pudo cargar el catálogo: HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Carga el catálogo de ejercicios en IndexedDB. Es seguro llamarla en cada
 * arranque: si ya está la misma versión del dataset, no hace nada.
 *
 * No puede duplicar ejercicios por dos motivos independientes:
 *  1. `meta.catalog.version` corta la ejecución antes de descargar nada.
 *  2. Aunque se fuerce, `bulkPut` inserta *por clave primaria*, y la clave es
 *     el id que trae el propio dataset ("0001"). Reimportar sobreescribe la
 *     misma fila en vez de añadir una nueva. Ahí está la ventaja de haber usado
 *     el id del dataset como clave en lugar de un autonumérico: sin él, cada
 *     import crearía 1.324 filas más.
 *
 * Los ejercicios propios (isCustom: 1) no se tocan: bulkPut solo escribe sobre
 * los ids del catálogo.
 */
export async function seedCatalog({ load = fetchCatalog, force = false } = {}) {
  const current = await db.meta.get(CATALOG_KEY)
  const payload = await load()

  if (!force && current?.version === payload.version) {
    return { imported: false, reason: 'ya-actualizado', count: current.count }
  }

  // Todo o nada: si el móvil se queda sin batería a mitad, no queremos un
  // catálogo con 700 ejercicios que además parezca completo. La marca de meta se
  // escribe dentro de la misma transacción que los datos, así que solo dice
  // "importado" si los 1.324 entraron.
  await db.transaction('rw', db.exercises, db.meta, async () => {
    await db.exercises.bulkPut(payload.exercises)
    await db.meta.put({
      key: CATALOG_KEY,
      version: payload.version,
      count: payload.exercises.length,
      importedAt: new Date().toISOString(),
    })
  })

  // El buscador guarda una copia en memoria; tras reimportar estaría desfasada.
  invalidateSearchIndex()

  return { imported: true, count: payload.exercises.length }
}

export function getCatalogStatus() {
  return db.meta.get(CATALOG_KEY)
}
