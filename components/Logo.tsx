interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  const r = Math.round(size * 0.22)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx={r} fill="#D81F26" />
      {/* Forward chevron — speed and direction */}
      <polyline
        points="11,9 21,16 11,23"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

interface LogoProps {
  markSize?: number
  className?: string
}

export default function Logo({ markSize = 32, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} />
      <span
        className="font-black text-brand-black leading-none"
        style={{ fontSize: markSize * 0.4, letterSpacing: '-0.02em' }}
      >
        Taxi Fast<br />
        <span className="font-medium text-gray-400" style={{ fontSize: markSize * 0.28 }}>
          Service
        </span>
      </span>
    </div>
  )
}
