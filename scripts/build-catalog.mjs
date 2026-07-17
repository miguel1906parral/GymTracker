// Genera public/exercises.json a partir del dataset original.
//
// Por qué existe este paso en vez de importar el JSON desde la app:
// `import exercises from './data/exercises.json'` haría que Vite metiera los
// 15,48 MB del dataset dentro del bundle de JavaScript, con los 10 idiomas
// incluidos, y el móvil tendría que descargarlos y parsearlos enteros al abrir
// la app. Recortando aquí, el navegador solo pide 1,8 MB, una única vez, y
// desde public/ se sirve como fichero estático (cacheable por el service worker
// cuando montemos la PWA) en lugar de engordar el bundle.
//
// Se ejecuta a mano cuando cambie el dataset:  npm run build:catalog
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizeName } from '../src/normalize.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'src/data/exercises.json')
const DICT = join(root, 'src/data/name-translations.json')
const OUTPUT = join(root, 'public/exercises.json')

const KEEP_LANGS = ['en', 'es']

const raw = readFileSync(SOURCE, 'utf8')
const rawDict = readFileSync(DICT, 'utf8')
const source = JSON.parse(raw)

// La versión es un hash del dataset Y del diccionario: si solo cubriera el
// dataset, al corregir una traducción cambiaría `nameEs` pero no la versión, y
// seedCatalog se saltaría la reimportación pensando que ya está al día. Las
// correcciones no llegarían nunca al móvil.
const version = createHash('sha256')
  .update(raw)
  .update(rawDict)
  .digest('hex')
  .slice(0, 12)

// El diccionario viene agrupado por categorías solo para que sea legible al
// editarlo a mano; aquí se aplana en una única tabla palabra -> traducción.
// Las claves que empiezan por "_" son documentación, no traducciones.
const dictionary = {}
for (const [group, pairs] of Object.entries(JSON.parse(rawDict))) {
  if (group.startsWith('_')) continue
  for (const [en, es] of Object.entries(pairs)) {
    if (dictionary[en] !== undefined && dictionary[en] !== es) {
      throw new Error(
        `El diccionario traduce "${en}" dos veces: "${dictionary[en]}" y "${es}"`,
      )
    }
    dictionary[en] = es
  }
}

// El dataset trae 4 nombres con el grado corrupto ("sled 45в° calf press"): al
// generarlo, un "°" (U+00B0) se codificó en UTF-8 y se releyó como cp1251, y
// cada byte acabó como un carácter distinto. Se arregla aquí y no en
// src/data/exercises.json para no tocar el dataset original: si algún día lo
// reemplazas por una versión nueva, la corrección se sigue aplicando sola.
function fixEncoding(text) {
  return text.replace(/в°/g, '°')
}

// Trocea el nombre respetando lo que significa cada parte:
// - los paréntesis se descartan pero su contenido se conserva: "(male)" es un
//   matiz que quieres poder buscar;
// - los compuestos con guion se mantienen enteros, porque "sit-up" es una
//   palabra ("abdominal") y partirla daría "sentado arriba", que es basura;
// - la puntuación pegada al final ("ball," / "hook.") se limpia.
function tokenize(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/[,.]+$/, ''))
    .filter(Boolean)
}

const untranslated = new Map()

// Construye el nombre en español palabra a palabra. No busca ser gramatical
// ("one arm row" -> "una brazo remo"): su único trabajo es que las palabras
// clave en español existan para poder buscarlas. Lo que no está en el
// diccionario se copia tal cual, que es justo lo que queremos con los nombres
// propios: "zottman" se llama igual en español.
function toSpanish(name) {
  return tokenize(name)
    .map((token) => {
      const hit = dictionary[token]
      if (hit !== undefined) return hit
      if (/[a-z]/.test(token)) {
        untranslated.set(token, (untranslated.get(token) ?? 0) + 1)
      }
      return token
    })
    .join(' ')
}

const problems = []

const exercises = source.map((e, i) => {
  // El dataset trae las instrucciones dos veces: `instructions[lang]` es un
  // párrafo y `instruction_steps[lang]` es ese mismo párrafo troceado en pasos.
  // Verificado sobre los 1.324: steps.join(' ') === párrafo, sin excepción. Se
  // conservan solo los pasos, que además son los que se pintan como lista
  // numerada; el párrafo se reconstruye con un join si algún día hace falta.
  for (const lang of KEEP_LANGS) {
    const steps = e.instruction_steps?.[lang]
    if (!Array.isArray(steps) || steps.length === 0) {
      problems.push(`[${i}] ${e.id}: sin instruction_steps.${lang}`)
    }
  }
  if (!e.id) problems.push(`[${i}]: sin id`)
  if (!e.name) problems.push(`[${i}] ${e.id}: sin name`)
  if (!e.attribution) problems.push(`[${i}] ${e.id}: sin attribution`)

  const name = fixEncoding(e.name)
  const nameEs = toSpanish(name)

  return {
    id: e.id,
    name,
    nameEs,
    // Se precalculan aquí, no en el móvil: normalizar 2.648 nombres es trabajo
    // que solo hay que hacer una vez, y así el import es un volcado directo.
    // El buscador compara contra estos dos campos, nunca contra `name`/`nameEs`.
    nameNormalized: normalizeName(name),
    nameEsNormalized: normalizeName(nameEs),
    category: e.category,
    bodyPart: e.body_part,
    target: e.target,
    muscleGroup: e.muscle_group,
    secondaryMuscles: e.secondary_muscles ?? [],
    equipment: e.equipment,
    instructionsEn: e.instruction_steps.en,
    instructionsEs: e.instruction_steps.es,
    image: e.image,
    gifUrl: e.gif_url,
    mediaId: e.media_id,
    // Obligatorio por licencia: se guarda pegado al ejercicio cuya imagen
    // ampara, para que no pueda perderse si el dataset cambia de origen.
    attribution: e.attribution,
    // 0 en vez de false: IndexedDB no admite booleanos como clave de índice.
    isCustom: 0,
  }
})

const ids = new Set(exercises.map((e) => e.id))
if (ids.size !== exercises.length) {
  problems.push(`ids duplicados: ${exercises.length - ids.size}`)
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problema(s) en el dataset:`)
  for (const p of problems.slice(0, 20)) console.error('  - ' + p)
  process.exit(1)
}

const payload = {
  version,
  generatedAt: new Date().toISOString(),
  count: exercises.length,
  exercises,
}

writeFileSync(OUTPUT, JSON.stringify(payload))

const mb = (n) => (n / 1048576).toFixed(2) + ' MB'
console.log(
  `Origen:   ${mb(Buffer.byteLength(raw))}  (${source.length} ejercicios, 10 idiomas)`,
)
console.log(
  `Salida:   ${mb(Buffer.byteLength(JSON.stringify(payload)))}  (${exercises.length} ejercicios, ${KEEP_LANGS.join('+')})`,
)
console.log(`Version:  ${version}`)
console.log(`Escrito:  public/exercises.json`)

// Informe de traducción: si un dataset nuevo trae vocabulario que el diccionario
// no cubre, aquí se ve. No es un error (las palabras se copian tal cual, que es
// lo correcto para los nombres propios), es un aviso por si merece traducirlas.
const totalTokens = source.reduce((n, e) => n + tokenize(e.name).length, 0)
const sinTraducir = [...untranslated.values()].reduce((a, b) => a + b, 0)
console.log(`\nTraducción de nombres:`)
console.log(`  diccionario:   ${Object.keys(dictionary).length} entradas`)
console.log(
  `  cobertura:     ${(((totalTokens - sinTraducir) / totalTokens) * 100).toFixed(1)}% de las apariciones`,
)
console.log(`  sin traducir:  ${untranslated.size} palabras distintas`)
if (untranslated.size > 0) {
  const lista = [...untranslated.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w, n]) => `${w}(${n})`)
    .join(' ')
  console.log(`    ${lista}`)
}
