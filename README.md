# Gym Tracker

App móvil-first para registrar entrenamientos de gimnasio sobre la marcha: ejercicios, series, repeticiones y peso, con historial completo. Sin cuentas, sin backend: todo se guarda en tu propio dispositivo.

> **Nota:** la app funciona 100% offline. Los datos se guardan localmente en el navegador (IndexedDB) y no salen del dispositivo; todavía no hay sincronización en la nube.

## Qué incluye

- **Registro de entrenamiento en vivo**: añade ejercicios y series (repeticiones × peso en kg) mientras entrenas, con validación de los datos introducidos.
- **Recuperación automática**: si cierras la pestaña a mitad de un entrenamiento, al volver lo encuentras tal y como lo dejaste (persistido en IndexedDB).
- **Historial de entrenamientos** con fecha, hora, duración, número de ejercicios y de series de cada sesión.
- **Detalle por entrenamiento**, con el desglose completo de ejercicios y series realizadas.
- **Confirmación antes de acciones irreversibles** (descartar un entrenamiento en curso o eliminar uno del historial).
- **Formato en español** (es-ES) para fechas y números, incluyendo coma decimal para el peso.
- **Diseño pensado para el móvil**, para usarse cómodamente desde el gimnasio.

## Cómo arrancar

```bash
npm install
npm run dev
```

Otros scripts disponibles:

```bash
npm run build     # build de producción
npm run lint      # eslint
npm run format    # prettier
```

## Stack

- React 19 + Vite
- Tailwind CSS 4
- [Dexie](https://dexie.org/) (IndexedDB) para persistencia local
- ESLint + Prettier