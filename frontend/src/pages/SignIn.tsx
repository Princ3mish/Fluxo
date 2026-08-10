import React, { useState } from 'react'
import { useSignInEmailPassword } from '@nhost/react'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

interface SignInProps {
  onSwitchToSignUp: () => void
}

export function SignIn({ onSwitchToSignUp }: SignInProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { signInEmailPassword, isLoading } = useSignInEmailPassword()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const res = await signInEmailPassword(email.trim(), password)
    if (res.isError) {
      setSubmitError(res.error?.message || 'Failed to sign in')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background bg-dot-grid relative p-6 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.45)_0%,rgba(15,23,42,0.95)_70%)] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 bg-surface/90 backdrop-blur-md border border-border/80 rounded-2xl p-8 shadow-[0_20px_50px_rgba(8,12,24,0.85)]">
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo size="lg" className="mb-3" />
          <p className="text-xs text-textSecondary leading-relaxed">Sign in to your orchestration workspace</p>
        </div>

        {submitError && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-start gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0 mt-0.5">error</span>
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signin-email"
              className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider"
            >
              Email Address
            </label>
            <input
              id="signin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@organization.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background/80 border border-border text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="signin-password"
                className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider"
              >
                Password
              </label>
            </div>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background/80 border border-border text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
            />
          </div>

          <Button
            type="submit"
            variant="accent"
            disabled={isLoading}
            className="w-full justify-center mt-2 py-2.5 text-xs font-semibold tracking-wide"
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border/60 text-center">
          <p className="text-xs text-textSecondary">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-accent hover:text-accentHover font-medium transition-colors duration-150 underline underline-offset-2 ml-0.5"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
