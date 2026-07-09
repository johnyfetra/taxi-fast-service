'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface Props {
  onSubmit: (name: string, phone: string) => void
  loading: boolean
}

const PHONE_VALID = /^03[0-9]{8}$/

function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('261')) d = '0' + d.slice(3)
  return d
}

function formatPhone(raw: string): string {
  const digits = normalizePhone(raw).slice(0, 10)
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
    if (!PHONE_VALID.test(normalizePhone(phone))) e.phone = 'Ex : 034 61 430 66 ou +261 34…'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit(name.trim(), normalizePhone(phone))
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
        hint="Ex : 034 61 430 66 ou +261 34…"
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
