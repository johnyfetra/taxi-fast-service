import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    const errorId = `${inputId}-error`

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-brand-black dark:text-white">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className={[
            'w-full px-4 py-3 rounded-xl border text-base',
            'bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
            'transition-colors min-h-12',
            error
              ? 'border-brand-red focus:ring-2 focus:ring-brand-red/30'
              : 'border-gray-300 dark:border-[#2A2A2C] focus:border-brand-red focus:ring-2 focus:ring-brand-red/20',
            'outline-none',
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-brand-red font-medium">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
