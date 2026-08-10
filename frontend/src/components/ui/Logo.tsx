interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
}

export function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  const textSizes = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base font-bold tracking-tight',
    lg: 'text-2xl font-extrabold tracking-tight',
  }

  const dotSizes = {
    sm: 2.5,
    md: 3,
    lg: 3.5,
  }

  const r = dotSizes[size]

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shadow-[0_0_16px_rgba(234,75,113,0.25)] shrink-0 transition-transform duration-200 hover:scale-105`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4"
        >
          <path
            d="M6 12C9 12 11 6 16 6M6 12C9 12 11 18 16 18"
            stroke="#EA4B71"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="5" cy="12" r={r} fill="#EA4B71" />
          <circle cx="18" cy="6" r={r} fill="#EA4B71" />
          <circle cx="18" cy="18" r={r} fill="#EA4B71" />
        </svg>
      </div>
      {showText && (
        <span className={`${textSizes[size]} text-textPrimary font-sans`}>
          Fluxo
        </span>
      )}
    </div>
  )
}
