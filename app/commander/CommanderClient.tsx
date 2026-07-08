'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { ServiceType, Location, EstimateResult } from '@/lib/types'
import ServiceSelector from '@/components/commander/ServiceSelector'
import AddressSearch from '@/components/commander/AddressSearch'
import EstimateCard from '@/components/commander/EstimateCard'
import PriceDecision from '@/components/commander/PriceDecision'
import ContactForm from '@/components/commander/ContactForm'
import ConfirmationScreen from '@/components/commander/ConfirmationScreen'
import Button from '@/components/ui/Button'
import { IconLocation, IconFlash, IconClock } from '@/components/icons'

function PinIcon({ filled, type }: { filled: boolean; type: 'departure' | 'arrival' }) {
  const color = !filled
    ? '#D1D5DB'
    : type === 'departure'
    ? '#D81F26'
    : '#3B82F6'
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8 0 13.25 8 20 8 20S16 13.25 16 8C16 3.58 12.42 0 8 0Z" fill={color} />
      <circle cx="8" cy="8" r="3" fill="white" />
    </svg>
  )
}

const LeafletMap = dynamic(() => import('@/components/commander/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-60 rounded-xl bg-brand-gray flex items-center justify-center text-gray-400 text-sm border border-gray-200">
      Chargement de la carte…
    </div>
  ),
})

type Step = 'service' | 'addresses' | 'estimate' | 'contact' | 'done' | 'cancelled'
type Decision = { type: 'accepted' }

const SIZES = ['petit', 'moyen', 'grand'] as const

const COLIS_TYPES = [
  { value: 'lettre',       label: 'Lettre / Enveloppe' },
  { value: 'document',     label: 'Document officiel' },
  { value: 'telephone',    label: 'Téléphone / Élec.' },
  { value: 'vetements',    label: 'Vêtements / Textile' },
  { value: 'medicaments',  label: 'Médicaments' },
  { value: 'nourriture',   label: 'Nourriture / Boisson' },
  { value: 'argent',       label: 'Argent / Valeur' },
  { value: 'autre',        label: 'Autre…' },
] as const

const COURSES_TYPES = [
  { value: 'epicerie',       label: 'Épicerie / Supermarché' },
  { value: 'marche',         label: 'Marché traditionnel' },
  { value: 'pharmacie',      label: 'Pharmacie' },
  { value: 'restaurant',     label: 'Restaurant / Repas' },
  { value: 'electromenager', label: 'Électroménager' },
  { value: 'autre',          label: 'Autre…' },
] as const

export default function CommanderClient({ initialService }: { initialService?: ServiceType }) {
  const [step, setStep] = useState<Step>(initialService ? 'addresses' : 'service')
  const [service, setService] = useState<ServiceType | null>(initialService ?? null)
  const [pickup, setPickup] = useState<Location | null>(null)
  const [dropoff, setDropoff] = useState<Location | null>(null)
  const [colisSize, setColisSize] = useState<'petit' | 'moyen' | 'grand'>('petit')
  const [colisQty, setColisQty] = useState(1)
  const [colisType, setColisType] = useState('')
  const [colisTypeAutre, setColisTypeAutre] = useState('')
  const [pickupSchedule, setPickupSchedule] = useState<'now' | 'later'>('now')
  const [pickupDatetime, setPickupDatetime] = useState('')
  const [coursesDesc, setCoursesDesc] = useState('')
  const [coursesQuartier, setCoursesQuartier] = useState('')
  const [coursesType, setCoursesType] = useState('')
  const [coursesTypeAutre, setCoursesTypeAutre] = useState('')
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')
  const [decision, setDecision] = useState<Decision | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [accessCode, setAccessCode] = useState<string | null>(null)
  const [geolocating, setGeolocating] = useState(false)

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas disponible sur votre navigateur.')
      return
    }
    setGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { lat, lng } = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        let label = 'Ma position actuelle'
        try {
          const res = await fetch(`/api/geocode?type=reverse&lat=${lat}&lng=${lng}`)
          if (res.ok) {
            const feat = await res.json()
            if (feat?.label) label = feat.label
          }
        } catch { /* keep friendly fallback */ }
        setPickup({ label, lat, lng, geolocated: true })
        setGeolocating(false)
      },
      () => {
        setGeolocating(false)
        alert('Impossible de détecter votre position. Veuillez saisir votre adresse manuellement.')
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }, [])

  const handleEstimate = useCallback(async () => {
    if (!service || !pickup || (service !== 'courses' && !dropoff)) return
    setEstimating(true)
    setEstimateError('')
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          pickup: { lat: pickup.lat, lng: pickup.lng },
          dropoff: dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : { lat: pickup.lat, lng: pickup.lng },
          details: service === 'colis' ? { size: colisSize, quantity: colisQty } : undefined,
        }),
      })
      if (!res.ok) throw new Error('Erreur réseau')
      const data: EstimateResult = await res.json()
      setEstimate(data)
      setStep('estimate')
    } catch {
      setEstimateError('Impossible de calculer l\'estimation. Vérifiez votre connexion.')
    } finally {
      setEstimating(false)
    }
  }, [service, pickup, dropoff, colisSize, colisQty])

  const handleDecide = useCallback((d: Decision) => {
    setDecision(d)
    setStep('contact')
  }, [])

  const handleCancel = useCallback(async (reason: string) => {
    try {
      await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          pickup,
          dropoff: dropoff ?? undefined,
          price_offered: estimate?.price ?? null,
          cancellation_reason: reason,
        }),
      })
    } catch { /* non-fatal */ }
    setStep('cancelled')
  }, [service, pickup, dropoff, estimate?.price])

  const handleSubmit = useCallback(
    async (name: string, phone: string) => {
      if (!service || !pickup || !decision) return
      setSubmitting(true)
      setSubmitError('')
      try {
        const body = {
          service,
          customer_name: name,
          customer_phone: phone,
          pickup,
          dropoff: dropoff ?? undefined,
          decision,
          details:
            service === 'colis'
              ? {
                  size: colisSize,
                  quantity: colisQty,
                  type_colis: colisType === 'autre' ? colisTypeAutre : colisType,
                  pickup_schedule: pickupSchedule,
                  pickup_datetime: pickupSchedule === 'later' ? pickupDatetime : undefined,
                }
              : service === 'courses'
              ? {
                  description: coursesDesc,
                  quartier: coursesQuartier,
                  type_courses: coursesType === 'autre' ? coursesTypeAutre : coursesType,
                }
              : service === 'taxi'
              ? {
                  pickup_schedule: pickupSchedule,
                  pickup_datetime: pickupSchedule === 'later' ? pickupDatetime : undefined,
                }
              : undefined,
          honeypot: '',
        }
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.status === 429) {
          setSubmitError('Trop de demandes. Veuillez réessayer dans une heure.')
          return
        }
        if (!res.ok) throw new Error('Erreur serveur')
        const data = await res.json()
        setOrderId(data.id)
        setAccessCode(data.access_code ?? null)
        setStep('done')
      } catch {
        setSubmitError('Erreur lors de l\'envoi. Vérifiez votre connexion et réessayez.')
      } finally {
        setSubmitting(false)
      }
    },
    [service, pickup, dropoff, decision, colisSize, colisQty, colisType, colisTypeAutre, pickupSchedule, pickupDatetime, coursesDesc, coursesQuartier, coursesType, coursesTypeAutre]
  )

  // Auto-estimate for courses when addresses step is ready
  useEffect(() => {
    if (service === 'courses' && step === 'addresses') {
      // Skip to estimate step directly for courses (no routing needed)
    }
  }, [service, step])

  const canProceedToEstimate =
    pickup && (service === 'courses' || dropoff)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-6">
          {(['service', 'addresses', 'estimate', 'contact'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  step === s
                    ? 'bg-brand-red text-white'
                    : ['service', 'addresses', 'estimate', 'contact'].indexOf(step) > i
                    ? 'bg-brand-black text-white'
                    : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {i + 1}
              </div>
              {i < 3 && <div className={['h-0.5 flex-1', i < ['service', 'addresses', 'estimate', 'contact'].indexOf(step) ? 'bg-brand-black' : 'bg-gray-200'].join(' ')} />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1 — Service */}
      {step === 'service' && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold text-brand-black">Quel service souhaitez-vous ?</h1>
          <ServiceSelector value={service} onChange={(s) => { setService(s); setStep('addresses') }} />
        </div>
      )}

      {/* STEP 2 — Addresses */}
      {step === 'addresses' && service && (
        <div className="flex flex-col gap-4">
          <button onClick={() => setStep('service')} className="text-sm text-gray-500 flex items-center gap-1">
            ← Changer de service
          </button>
          <h1 className="text-xl font-bold text-brand-black">
            {service === 'taxi' ? 'Votre trajet' : service === 'colis' ? 'Livraison de colis' : 'Votre commande de courses'}
          </h1>

          {/* Départ + Arrivée avec connecteur visuel */}
          <div className="flex gap-3 items-stretch">
            {/* Colonne gauche : pins GPS + tiret discontinu */}
            <div className="flex flex-col items-center flex-shrink-0 w-4" style={{ paddingTop: '2px' }}>
              <PinIcon filled={!!pickup} type="departure" />
              {service !== 'courses' && (
                <>
                  <div
                    className="flex-1 my-1.5"
                    style={{ width: 0, borderLeft: '2px dashed #D1D5DB', minHeight: 60 }}
                  />
                  <PinIcon filled={!!dropoff} type="arrival" />
                </>
              )}
            </div>

            {/* Colonne droite : champs */}
            <div className="flex flex-col flex-1 min-w-0" style={{ gap: service !== 'courses' ? 20 : 0 }}>
              {/* Départ */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-brand-red">Point de départ</span>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  loading={geolocating}
                  onClick={handleGeolocate}
                  type="button"
                >
                  <IconLocation size={17} />
                  {geolocating ? 'Détection en cours…' : 'Ma position actuelle'}
                </Button>
                <AddressSearch
                  label="Ou rechercher l'adresse"
                  placeholder="Quartier, rue, lieu-dit…"
                  value={pickup}
                  onChange={setPickup}
                />
              </div>

              {/* Arrivée — pas pour courses */}
              {service !== 'courses' && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-blue-500">Point d'arrivée</span>
                  <AddressSearch
                    label="Rechercher la destination"
                    placeholder="Rechercher la destination…"
                    value={dropoff}
                    onChange={setDropoff}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Carte — max 40% de la hauteur sur mobile */}
          {(pickup || dropoff) && service !== 'courses' && (
            <LeafletMap
              pickup={pickup}
              dropoff={dropoff}
              onPickupChange={setPickup}
              onDropoffChange={setDropoff}
            />
          )}

          {/* Options colis */}
          {service === 'colis' && (
            <div className="flex flex-col gap-4">
              {/* Type de colis */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-brand-black">Type de colis</p>
                <div className="grid grid-cols-2 gap-2">
                  {COLIS_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setColisType(t.value)}
                      className={[
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left',
                        colisType === t.value
                          ? 'border-brand-red bg-red-50 text-brand-red'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <span className={['w-2 h-2 rounded-full flex-shrink-0', colisType === t.value ? 'bg-brand-red' : 'bg-gray-300'].join(' ')} />
                      {t.label}
                    </button>
                  ))}
                </div>
                {colisType === 'autre' && (
                  <input
                    type="text"
                    value={colisTypeAutre}
                    onChange={(e) => setColisTypeAutre(e.target.value)}
                    placeholder="Décrivez le colis…"
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12"
                  />
                )}
              </div>

              {/* Taille */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-brand-black">Taille du colis</p>
                <div className="flex gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setColisSize(s)}
                      className={[
                        'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                        colisSize === s
                          ? 'border-brand-red bg-red-50 text-brand-red'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantité */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-brand-black">Quantité</span>
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setColisQty(Math.max(1, colisQty - 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-lg hover:border-brand-red transition-colors"
                    aria-label="Diminuer"
                  >−</button>
                  <span className="text-lg font-bold w-6 text-center">{colisQty}</span>
                  <button
                    type="button"
                    onClick={() => setColisQty(Math.min(10, colisQty + 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-lg hover:border-brand-red transition-colors"
                    aria-label="Augmenter"
                  >+</button>
                </div>
              </div>
            </div>
          )}

          {/* Courses details */}
          {service === 'courses' && (
            <div className="flex flex-col gap-4">
              {/* Type de courses */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-brand-black">Type de courses</p>
                <div className="grid grid-cols-2 gap-2">
                  {COURSES_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setCoursesType(t.value)}
                      className={[
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left',
                        coursesType === t.value
                          ? 'border-brand-red bg-red-50 text-brand-red'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <span className={['w-2 h-2 rounded-full flex-shrink-0', coursesType === t.value ? 'bg-brand-red' : 'bg-gray-300'].join(' ')} />
                      {t.label}
                    </button>
                  ))}
                </div>
                {coursesType === 'autre' && (
                  <input
                    type="text"
                    value={coursesTypeAutre}
                    onChange={(e) => setCoursesTypeAutre(e.target.value)}
                    placeholder="Précisez le type de courses…"
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-brand-black" htmlFor="quartier">Quartier de livraison</label>
                <input
                  id="quartier"
                  type="text"
                  value={coursesQuartier}
                  onChange={(e) => setCoursesQuartier(e.target.value)}
                  placeholder="Ex : Analakely, Ivandry…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-brand-black" htmlFor="description">Liste de courses détaillée</label>
                <textarea
                  id="description"
                  value={coursesDesc}
                  onChange={(e) => setCoursesDesc(e.target.value)}
                  placeholder="Ex : 2 bouteilles d'eau, pain, tomates, savon…"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base resize-none"
                />
              </div>
            </div>
          )}

          {/* Date/heure de récupération — taxi et colis uniquement */}
          {(service === 'taxi' || service === 'colis') && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-brand-black">Quand souhaitez-vous être pris en charge ?</p>
              <div className="flex gap-2">
                {[
                  { value: 'now' as const,   label: 'Maintenant', Icon: IconFlash },
                  { value: 'later' as const, label: 'Planifier',   Icon: IconClock },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPickupSchedule(value)}
                    className={[
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                      pickupSchedule === value
                        ? 'border-brand-red bg-red-50 text-brand-red'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    ].join(' ')}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              {pickupSchedule === 'later' && (
                <input
                  type="datetime-local"
                  value={pickupDatetime}
                  onChange={(e) => setPickupDatetime(e.target.value)}
                  min={new Date(Date.now() + 10 * 60000).toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12"
                />
              )}
            </div>
          )}

          {estimateError && (
            <p role="alert" className="text-sm text-brand-red bg-red-50 rounded-xl px-4 py-3">
              {estimateError}
            </p>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!canProceedToEstimate}
            loading={estimating}
            onClick={handleEstimate}
          >
            {service === 'courses' ? 'Envoyer ma demande de devis →' : 'Calculer le tarif →'}
          </Button>
        </div>
      )}

      {/* STEP 3 — Estimate + Decision */}
      {step === 'estimate' && estimate && service && (
        <div className="flex flex-col gap-4">
          <button onClick={() => setStep('addresses')} className="text-sm text-gray-500 flex items-center gap-1">
            ← Modifier les adresses
          </button>
          <h1 className="text-xl font-bold text-brand-black">Votre estimation</h1>

          {/* Récapitulatif trajet */}
          {pickup && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              {/* Départ → Arrivée */}
              <div className="flex items-stretch gap-3">
                {/* Timeline */}
                <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-red ring-2 ring-red-100" />
                  {dropoff && <div className="w-px flex-1 bg-gray-200 my-1.5" />}
                  {dropoff && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" />}
                </div>
                {/* Labels */}
                <div className="flex flex-col flex-1 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Départ</p>
                    <p className="text-sm font-medium text-brand-black leading-snug line-clamp-2">{pickup.label}</p>
                  </div>
                  {dropoff && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Arrivée</p>
                      <p className="text-sm font-medium text-brand-black leading-snug line-clamp-2">{dropoff.label}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date de récupération — taxi & colis uniquement */}
              {(service === 'taxi' || service === 'colis') && (
                <>
                  <div className="border-t border-gray-100 mt-3.5 mb-3" />
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-brand-gray flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Prise en charge</p>
                      {pickupSchedule === 'now' ? (
                        <p className="text-sm font-semibold text-green-600">Maintenant</p>
                      ) : (
                        <p className="text-sm font-semibold text-brand-black">
                          {pickupDatetime
                            ? new Date(pickupDatetime).toLocaleString('fr-FR', {
                                weekday: 'short', day: 'numeric', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <EstimateCard estimate={estimate} service={service} />
          <PriceDecision
            price={estimate.price}
            onDecide={handleDecide}
            onCancel={handleCancel}
            minPrice={estimate.min_price}
            pricePerKm={estimate.price_per_km}
          />
        </div>
      )}

      {/* STEP 4 — Contact */}
      {step === 'contact' && (
        <div className="flex flex-col gap-4">
          <button onClick={() => setStep('estimate')} className="text-sm text-gray-500 flex items-center gap-1">
            ← Retour
          </button>
          <h1 className="text-xl font-bold text-brand-black">Vos coordonnées</h1>
          <p className="text-sm text-gray-500">Nous vous appellerons pour confirmer.</p>
          {submitError && (
            <p role="alert" className="text-sm text-brand-red bg-red-50 rounded-xl px-4 py-3">
              {submitError}
            </p>
          )}
          <ContactForm onSubmit={handleSubmit} loading={submitting} />
        </div>
      )}

      {/* Annulation enregistrée */}
      {step === 'cancelled' && (
        <div className="flex flex-col items-center text-center gap-6 py-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
            ✕
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-brand-black">Commande annulée</h1>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Votre refus a été enregistré. Nous en prenons note pour améliorer notre service.
            </p>
          </div>
          <button
            onClick={() => {
              setStep('service')
              setPickup(null)
              setDropoff(null)
              setEstimate(null)
              setDecision(null)
            }}
            className="w-full max-w-xs bg-brand-black text-white font-semibold rounded-2xl py-3.5 text-sm hover:bg-gray-800 transition-colors"
          >
            Nouvelle commande
          </button>
        </div>
      )}

      {/* Confirmation */}
      {step === 'done' && service && (
        <ConfirmationScreen
          orderId={orderId}
          service={service}
          customerName=""
          pickup={pickup}
          dropoff={dropoff}
          price={estimate?.price ?? null}
          accessCode={accessCode}
        />
      )}
    </div>
  )
}
