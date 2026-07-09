import Image from 'next/image'

interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <Image
      src="/logo.png"
      alt="Taxi Fast Service"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}

interface LogoProps {
  markSize?: number
  className?: string
}

export default function Logo({ markSize = 32, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <LogoMark size={markSize} />
    </div>
  )
}
