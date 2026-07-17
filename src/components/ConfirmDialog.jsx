export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      {/* El velo oscurece y empuja el fondo hacia atrás: es una tarea modal, y
          atenuar el resto deja claro que hay que resolverla antes de seguir. */}
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Cancelar"
        tabIndex={-1}
      />
      {/* Entra desde abajo y con un punto de escala: nada en el mundo real
          aparece de la nada, así que nunca se anima desde scale(0). */}
      <div
        role="alertdialog"
        aria-modal="true"
        className="animate-dialog relative w-full max-w-sm rounded-3xl border border-ink-700 bg-ink-850 p-5"
      >
        <h2 className="text-[17px] font-semibold text-ink-100">{title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          {message}
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="press flex-1 rounded-xl border border-ink-700 py-3 text-[15px] font-medium text-ink-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="press flex-1 rounded-xl bg-danger py-3 text-[15px] font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
