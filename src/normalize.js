// Búsquedas del catálogo sin depender de mayúsculas ni acentos: IndexedDB
// compara el texto tal cual, así que el nombre normalizado se guarda aparte.
//
// Vive en su propio módulo (sin dependencias) para que lo puedan importar tanto
// la app como el script que genera el catálogo: si la normalización cambiara,
// debe cambiar en los dos sitios a la vez o las búsquedas dejarían de encontrar
// lo que ya está guardado.
export function normalizeName(name) {
  return name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim()
}
