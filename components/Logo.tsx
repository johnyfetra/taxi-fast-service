import Image from 'next/image'

interface LogoMarkProps {
  height?: number
  className?: string
}

// Dimensions réelles du logo recadré : 1217×586
const LOGO_W = 1217
const LOGO_H = 586

export function LogoMark({ height = 48, className = '' }: LogoMarkProps) {
  const w = Math.round((height * LOGO_W) / LOGO_H)
  return (
    <Image
      src="/logo-transparent.png"
      alt="Taxi Fast Service"
      width={w}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}

interface LogoProps {
  height?: number
  className?: string
}

export default function Logo({ height = 48, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <LogoMark height={height} />
    </div>
  )
}
