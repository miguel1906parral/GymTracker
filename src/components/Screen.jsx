/**
 * Estructura común de las pantallas con pestañas.
 *
 * El contenido hace scroll por DEBAJO de la barra inferior translúcida, así que
 * lleva un colchón abajo (`pb-28`) para que el último elemento no quede tapado.
 * El título usa un tamaño grande con tracking negativo, al estilo de los
 * "large titles" de iOS: da jerarquía sin necesidad de una barra pesada.
 */
export default function Screen({ title, action, children, scroll = true }) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-end justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <h1 className="text-[27px] leading-none font-bold text-ink-100">
          {title}
        </h1>
        {action}
      </header>
      <div
        className={`min-h-0 flex-1 ${scroll ? 'overflow-y-auto' : 'flex flex-col'} pb-28`}
      >
        {children}
      </div>
    </div>
  )
}
