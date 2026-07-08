import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-brand-red text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  secondary: 'border-2 border-brand-red text-brand-red hover:bg-red-50 active:bg-red-100',
  ghost: 'text-brand-black hover:bg-brand-gray active:bg-brand-gray-dark',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm min-h-9',
  md: 'px-4 py-3 text-base min-h-11',
  lg: 'px-6 py-4 text-lg min-h-12',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
          'transition-colors cursor-pointer select-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variantClass[variant],
          sizeClass[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
