const dateFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFmt = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso) {
  return dateFmt.format(new Date(iso))
}

export function formatTime(iso) {
  return timeFmt.format(new Date(iso))
}

export function formatDuration(startIso, endIso) {
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)} h ${mins % 60} min`
}

export function formatWeight(kg) {
  // Sin decimales innecesarios: 60 -> "60", 62.5 -> "62,5"
  return kg.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}
