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
        'bg-white dark:bg-[#141416] rounded-2xl border border-gray-200 dark:border-[#2A2A2C] shadow-sm dark:shadow-black/20',
        paddingClass[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
