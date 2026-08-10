import React from 'react'

type ButtonVariant = 'primary' | 'accent' | 'surface' | 'secondary' | 'danger' | 'success'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: string
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-[0_3px_0_0_#b91c47] active:shadow-none active:translate-y-[2px] hover:bg-accentHover disabled:shadow-none disabled:translate-y-0',
  accent:
    'bg-accent text-white shadow-[0_3px_0_0_#b91c47] active:shadow-none active:translate-y-[2px] hover:bg-accentHover disabled:shadow-none disabled:translate-y-0',
  secondary:
    'bg-primary text-white shadow-[0_3px_0_0_#4338ca] active:shadow-none active:translate-y-[2px] hover:bg-indigo-500 disabled:shadow-none disabled:translate-y-0',
  surface:
    'bg-surface text-textPrimary border border-border shadow-[0_3px_0_0_#1a2335] active:shadow-none active:translate-y-[2px] hover:bg-background disabled:shadow-none disabled:translate-y-0',
  danger:
    'bg-rose-600 text-white shadow-[0_3px_0_0_#9f1239] active:shadow-none active:translate-y-[2px] hover:bg-rose-500 disabled:shadow-none disabled:translate-y-0',
  success:
    'bg-emerald-600 text-white shadow-[0_3px_0_0_#065f46] active:shadow-none active:translate-y-[2px] hover:bg-emerald-500 disabled:shadow-none disabled:translate-y-0',
}

export function Button({
  variant = 'primary',
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
        'transition-all duration-75 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {icon && (
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      )}
      {children}
    </button>
  )
}
