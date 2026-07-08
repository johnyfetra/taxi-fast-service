'use client'
import { useEffect, useState } from 'react'
import type { Vehicle, VehicleStatus, VehicleType } from '@/lib/types'
import { IconBike, IconMoto, IconPlus, IconEdit, IconX } from '@/components/icons'

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string }> = {
  disponible:   { label: 'Disponible',   color: 'bg-green-100 text-green-700' },
  en_course:    { label: 'En course',    color: 'bg-blue-100 text-blue-700' },
  maintenance:  { label: 'Maintenance',  color: 'bg-amber-100 text-amber-700' },
  hors_service: { label: 'Hors service', color: 'bg-red-100 text-red-700' },
}

const STATUSES: VehicleStatus[] = ['disponible', 'en_course', 'maintenance', 'hors_service']

function VehicleModal({ vehicle, onClose, onSave }: {
  vehicle: Partial<Vehicle> | null
  onClose: () => void
  onSave: (v: Partial<Vehicle>) => void
}) {
  const [form, setForm] = useState<{ type: VehicleType; label: string; plate: string; notes: string; id?: string }>({
    type: (vehicle?.type ?? 'moto') as VehicleType,
    label: vehicle?.label ?? '',
    plate: vehicle?.plate ?? '',
    notes: vehicle?.notes ?? '',
    id: vehicle?.id,
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-2xl mx-auto flex flex-col"
        style={{ maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — toujours visible */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <p className="font-bold text-brand-black">{vehicle?.id ? 'Modifier' : 'Ajouter un véhicule'}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <IconX size={16} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
          <div className="flex gap-2">
            {(['moto', 'velo'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${form.type === t ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t === 'moto' ? 'Moto' : 'Vélo'}
              </button>
            ))}
          </div>
          {(['label', 'plate', 'notes'] as const).map(field => (
            <input key={field}
              placeholder={field === 'label' ? 'Nom (ex: Moto principale)' : field === 'plate' ? 'Immatriculation (optionnel)' : 'Notes (optionnel)'}
              value={(form[field] as string) ?? ''}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red"
            />
          ))}
        </div>

        {/* Bouton — toujours visible en bas */}
        <div className="px-4 pt-2 pb-6 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={() => { if (form.label?.trim()) { onSave(form); onClose() } }}
            disabled={!form.label?.trim()}
            className="w-full bg-brand-red text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {vehicle?.id ? 'Enregistrer les modifications' : 'Ajouter le véhicule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FlottePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; vehicle: Partial<Vehicle> | null }>({ open: false, vehicle: null })

  const load = () => {
    fetch('/api/admin/vehicles').then(r => r.json()).then(d => { setVehicles(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: VehicleStatus) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, status } : v))
    await fetch(`/api/admin/vehicles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  const saveVehicle = async (data: Partial<Vehicle>) => {
    if (data.id) {
      await fetch(`/api/admin/vehicles/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/admin/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    load()
  }

  const dispoCount = vehicles.filter(v => v.status === 'disponible').length
  const enCourseCount = vehicles.filter(v => v.status === 'en_course').length

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-black">Flotte</h1>
        <button onClick={() => setModal({ open: true, vehicle: null })}
          className="flex items-center gap-1.5 bg-brand-red text-white px-3 py-2 rounded-xl text-xs font-semibold">
          <IconPlus size={14} /> Ajouter
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-3 border border-green-100">
          <p className="text-lg font-bold text-green-700">{dispoCount}</p>
          <p className="text-xs text-green-600">Disponible{dispoCount > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
          <p className="text-lg font-bold text-blue-700">{enCourseCount}</p>
          <p className="text-xs text-blue-600">En course</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Chargement…</div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Aucun véhicule</div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {v.type === 'moto' ? <IconMoto size={20} className="text-brand-red" /> : <IconBike size={20} className="text-brand-red" />}
                  <div>
                    <p className="font-semibold text-brand-black text-sm">{v.label}</p>
                    {v.plate && <p className="text-xs text-gray-400">{v.plate}</p>}
                  </div>
                </div>
                <button onClick={() => setModal({ open: true, vehicle: v })} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600">
                  <IconEdit size={14} />
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => updateStatus(v.id, s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${v.status === s ? STATUS_CONFIG[s].color + ' ring-1 ring-current' : 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
              {v.notes && <p className="text-xs text-gray-400 mt-2">{v.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {modal.open && <VehicleModal vehicle={modal.vehicle} onClose={() => setModal({ open: false, vehicle: null })} onSave={saveVehicle} />}
    </div>
  )
}
