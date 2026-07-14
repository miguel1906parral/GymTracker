import { useState } from 'react'
import { WorkoutProvider, useWorkouts } from './context/WorkoutContext'
import ActiveWorkout from './components/ActiveWorkout'
import History from './components/History'
import WorkoutDetail from './components/WorkoutDetail'

function Screens() {
  const { loading, active, startWorkout } = useWorkouts()
  const [view, setView] = useState({ name: 'history' })

  if (loading) return null

  if (view.name === 'active' && active) {
    return <ActiveWorkout onDone={() => setView({ name: 'history' })} />
  }

  if (view.name === 'detail') {
    return (
      <WorkoutDetail
        workoutId={view.workoutId}
        onBack={() => setView({ name: 'history' })}
      />
    )
  }

  return (
    <History
      onStart={async () => {
        await startWorkout()
        setView({ name: 'active' })
      }}
      onContinue={() => setView({ name: 'active' })}
      onOpen={(workoutId) => setView({ name: 'detail', workoutId })}
    />
  )
}

export default function App() {
  return (
    <WorkoutProvider>
      <Screens />
    </WorkoutProvider>
  )
}
