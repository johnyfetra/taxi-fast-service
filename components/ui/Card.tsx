interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClass = { sm: 'p-3', md: 'p-4', lg: 'p-6' }

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-2xl border border-gray-200 shadow-sm',
        paddingClass[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
