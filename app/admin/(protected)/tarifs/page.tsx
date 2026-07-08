'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PricingRule } from '@/lib/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const SERVICE_LABELS = { taxi: '🏍️ Taxi-moto', colis: '📦 Colis', courses: '🛒 Courses' }

export default function TarifsPage() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!supabase) return
    supabase.from('pricing_rules').select('*').then(({ data }) => {
      if (data) setRules(data as PricingRule[])
    })
  }, [supabase])

  const update = (service: string, field: string, value: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.service === service ? { ...r, [field]: Number.parseInt(value) || 0 } : r
      )
    )
  }

  const save = async (rule: PricingRule) => {
    if (!supabase) return
    setSaving(rule.service)
    const { error } = await supabase
      .from('pricing_rules')
      .update({
        base_price: rule.base_price,
        price_per_km: rule.price_per_km,
        min_price: rule.min_price,
      })
      .eq('service', rule.service)
    setSaving(null)
    if (!error) {
      setSaved(rule.service)
      setTimeout(() => setSaved(null), 2000)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-sm text-gray-500">← Retour</a>
        <h1 className="text-lg font-bold text-brand-black">Tarifs</h1>
      </div>

      {rules.map((rule) => (
        <div key={rule.service} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
          <p className="font-semibold text-brand-black">{SERVICE_LABELS[rule.service as keyof typeof SERVICE_LABELS]}</p>
          {rule.service !== 'courses' && (
            <>
              <Input
                label="Prix de base (Ar)"
                type="number"
                inputMode="numeric"
                value={rule.base_price.toString()}
                onChange={(e) => update(rule.service, 'base_price', e.target.value)}
              />
              <Input
                label="Prix par km (Ar)"
                type="number"
                inputMode="numeric"
                value={rule.price_per_km.toString()}
                onChange={(e) => update(rule.service, 'price_per_km', e.target.value)}
              />
            </>
          )}
          <Input
            label="Prix minimum (Ar)"
            type="number"
            inputMode="numeric"
            value={rule.min_price.toString()}
            onChange={(e) => update(rule.service, 'min_price', e.target.value)}
          />
          <Button
            size="md"
            className="w-full"
            loading={saving === rule.service}
            onClick={() => save(rule)}
          >
            {saved === rule.service ? '✓ Enregistré !' : 'Enregistrer'}
          </Button>
        </div>
      ))}
    </div>
  )
}
