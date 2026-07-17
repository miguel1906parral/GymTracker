import { useCallback, useEffect, useState } from 'react'
import { WorkoutProvider } from './context/WorkoutContext'
import { seedCatalog } from './catalog.js'
import TabBar from './components/TabBar'
import WorkoutTab from './components/WorkoutTab'
import Routines from './components/Routines'
import Profile from './components/Profile'

function Aviso({ children }) {
  return (
    <div className="flex h-dvh items-center justify-center p-8">
      <p className="text-center text-sm text-ink-400">{children}</p>
    </div>
  )
}

function Screens() {
  const [tab, setTab] = useState('workout')

  // Empezar una rutina crea la sesión y salta a "Entrenar": la navegación es
  // consecuencia de la acción, así que el salto de pestaña vive aquí y las
  // pantallas solo avisan de lo que ha pasado.
  const irAEntrenar = useCallback(() => setTab('workout'), [])

  return (
    <>
      {tab === 'workout' && (
        <WorkoutTab onVerRutinas={() => setTab('routines')} />
      )}
      {tab === 'routines' && <Routines onEmpezada={irAEntrenar} />}
      {tab === 'profile' && <Profile />}
      <TabBar value={tab} onChange={setTab} />
    </>
  )
}

export default function App() {
  // El catálogo se carga una sola vez, la primera vez que abres la app: son
  // ~2 MB que se descargan y se guardan en IndexedDB. A partir de ahí ya está en
  // el dispositivo y `seedCatalog` sale enseguida sin descargar nada, así que
  // esto también funciona sin conexión.
  const [catalog, setCatalog] = useState({ estado: 'cargando' })

  useEffect(() => {
    let cancelado = false
    seedCatalog()
      .then((r) => !cancelado && setCatalog({ estado: 'listo', ...r }))
      .catch((e) => !cancelado && setCatalog({ estado: 'error', error: e }))
    return () => {
      cancelado = true
    }
  }, [])

  if (catalog.estado === 'cargando') {
    return <Aviso>Preparando el catálogo de ejercicios…</Aviso>
  }
  if (catalog.estado === 'error') {
    return (
      <Aviso>
        No se pudo cargar el catálogo de ejercicios.
        <br />
        {String(catalog.error?.message ?? catalog.error)}
      </Aviso>
    )
  }

  return (
    <WorkoutProvider>
      <Screens />
    </WorkoutProvider>
  )
}
