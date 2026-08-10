import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthenticationStatus } from '@nhost/react'
import { SignIn } from '../pages/SignIn'
import { SignUp } from '../pages/SignUp'

export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthenticationStatus()
  const [view, setView] = useState<'signin' | 'signup'>('signin')

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background bg-dot-grid relative select-none">
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-surface/90 border border-border/80 text-textSecondary text-xs shadow-lg backdrop-blur">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading session…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (view === 'signup') {
      return <SignUp onSwitchToSignIn={() => setView('signin')} />
    }
    return <SignIn onSwitchToSignUp={() => setView('signup')} />
  }

  return <>{children}</>
}
