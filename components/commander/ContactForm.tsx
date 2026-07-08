'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface Props {
  onSubmit: (name: string, phone: string) => void
  loading: boolean
}

const PHONE_RE = /^03[0-9] [0-9]{2} [0-9]{3} [0-9]{2}$/

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

export default function ContactForm({ onSubmit, loading }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (name.trim().length < 2) e.name = 'Votre nom est requis (min 2 caractères)'
    if (!PHONE_RE.test(phone)) e.phone = 'Format attendu : 034 61 430 66'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit(name.trim(), phone)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Votre nom"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="Ex : Hery Rakoto"
      />
      <Input
        label="Votre numéro WhatsApp / téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        error={errors.phone}
        hint="Format : 03X XX XXX XX"
        placeholder="034 61 430 66"
      />

      {/* Honeypot — caché des utilisateurs normaux */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: 'none' }}
        data-honeypot="true"
      />

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? 'Envoi en cours…' : 'Envoyer ma demande →'}
      </Button>
    </form>
  )
}
