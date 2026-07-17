const TABS = [
  { id: 'workout', label: 'Entrenar', icon: IconoPesa },
  { id: 'routines', label: 'Rutinas', icon: IconoLista },
  { id: 'profile', label: 'Perfil', icon: IconoPerfil },
]

function IconoPesa({ activo }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"
        stroke="currentColor"
        strokeWidth={activo ? 2.4 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoLista({ activo }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth={activo ? 2.4 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoPerfil({ activo }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth={activo ? 2.4 : 1.8}
      />
      <path
        d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
        stroke="currentColor"
        strokeWidth={activo ? 2.4 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function TabBar({ value, onChange }) {
  return (
    <nav
      // `pb-[env(safe-area-inset-bottom)]` deja hueco para la barra de gestos
      // del móvil: sin esto, en un iPhone las pestañas quedan debajo de ella.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/70 bg-ink-950/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const activo = value === tab.id
          const Icono = tab.icon
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={activo ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-2 transition-colors duration-150 ${
                  activo ? 'text-volt-500' : 'text-ink-400 active:text-ink-300'
                }`}
              >
                <Icono activo={activo} />
                <span
                  className={`text-[11px] ${activo ? 'font-semibold' : 'font-medium'}`}
                >
                  {tab.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
