import { useEffect, useState } from 'react'

// Anima un número desde 0 hasta `target` cuando aparece en pantalla. Los datos
// de esta app son números (entrenos del mes, kilos, 1RM): un número que sube
// rápido se lee como un logro, mientras que uno que aparece de golpe se lee como
// texto plano. Arranca veloz y frena al final (easeOutCubic), que es la curva de
// "entrada" correcta: el usuario mira justo el principio.
//
// Devuelve un número redondeado. Para valores con decimales (1RM) se pasa
// `decimals` y se interpola con esa precisión.
export function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  // Empieza en 0 y sube. Todo el avance del valor ocurre DENTRO del callback de
  // requestAnimationFrame (asíncrono), nunca de forma síncrona en el efecto:
  // eso evita renders en cascada y respeta la regla de React 19.
  const [value, setValue] = useState(0)

  useEffect(() => {
    // Movimiento reducido = sin animación: la duración efectiva es 0, así que el
    // primer frame ya deja el valor final. Se quita el movimiento, no el dato
    // (igual que el CSS global de la app). Un target no finito (p. ej. un récord
    // sin series) también salta directo.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduce || !Number.isFinite(target) ? 0 : duration

    const factor = 10 ** decimals
    const easeOutCubic = (t) => 1 - (1 - t) ** 3
    const start = performance.now()
    let raf = 0

    const tick = (now) => {
      const p = dur <= 0 ? 1 : Math.min(1, (now - start) / dur)
      const raw = easeOutCubic(p) * target
      setValue(Math.round(raw * factor) / factor)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, decimals])

  return value
}
