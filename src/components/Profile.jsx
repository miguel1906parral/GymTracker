import Screen from './Screen'

// Marcador de posición: el contenido (historial, récords, progreso) es el
// siguiente paso y no se construye aquí.
export default function Profile() {
  return (
    <Screen title="Mi perfil">
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 ring-1 ring-ink-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7 text-ink-400"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="3.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-sm text-ink-400">
          Aquí vivirán tu historial, tus récords y tu progreso.
        </p>
      </div>
    </Screen>
  )
}
