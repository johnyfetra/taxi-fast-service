'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { ServiceType, Location, EstimateResult } from '@/lib/types'
import ServiceSelector from '@/components/commander/ServiceSelector'
import SearchModal from '@/components/commander/SearchModal'
import EstimateCard from '@/components/commander/EstimateCard'
import PriceDecision from '@/components/commander/PriceDecision'
import ContactForm from '@/components/commander/ContactForm'
import ConfirmationScreen from '@/components/commander/ConfirmationScreen'
import Button from '@/components/ui/Button'
import { IconLocation, IconFlash, IconClock, IconMapPin } from '@/components/icons'


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
  const [geoError, setGeoError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [userLabel, setUserLabel] = useState<string | null>(null)
  const [searchModal, setSearchModal] = useState<{ activeField: 'pickup' | 'dropoff' } | null>(null)
  const prevPickupRef = useRef<Location | null>(null)
  const userPosAskedRef = useRef(false)

  // Géolocalisation silencieuse + reverse geocode pour afficher le nom du lieu sur la carte
  useEffect(() => {
    if (step !== 'addresses' || service === 'courses' || userPosAskedRef.current) return
    if (!navigator.geolocation) return
    userPosAskedRef.current = true
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserPosition({ lat, lng })
        try {
          const res = await fetch(`/api/geocode?type=reverse&lat=${lat}&lng=${lng}`)
          if (res.ok) {
            const feat = await res.json()
            if (feat?.label) setUserLabel(feat.label)
          }
        } catch { /* silencieux */ }
      },
      () => {}
    )
  }, [step, service])

  // Ouvre le modal arrivée dès que le départ est renseigné pour la première fois
  useEffect(() => {
    const wasEmpty = prevPickupRef.current === null
    const isNowSet = pickup !== null
    if (wasEmpty && isNowSet && service !== 'courses' && !dropoff) {
      setTimeout(() => setSearchModal({ activeField: 'dropoff' }), 250)
    }
    prevPickupRef.current = pickup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup])

  const handleGeolocate = useCallback(() => {
    setGeoError('')
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas disponible sur votre navigateur.')
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
      (err) => {
        setGeolocating(false)
        if (err.code === 1) {
          setGeoError('Accès à la position refusé. Autorisez la géolocalisation dans les paramètres de votre navigateur.')
        } else {
          setGeoError('Impossible de détecter votre position. Veuillez saisir votre adresse manuellement.')
        }
      },
      { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
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
        setCustomerName(name)
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

  const needsDatetime = (service === 'taxi' || service === 'colis') && pickupSchedule === 'later'
  const canProceedToEstimate =
    pickup && (service === 'courses' || dropoff) &&
    (!needsDatetime || !!pickupDatetime)

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
                    ? 'bg-brand-black dark:bg-white text-white dark:text-brand-black'
                    : 'bg-gray-200 dark:bg-[#2A2A2C] text-gray-500 dark:text-gray-400',
                ].join(' ')}
              >
                {i + 1}
              </div>
              {i < 3 && <div className={['h-0.5 flex-1', i < ['service', 'addresses', 'estimate', 'contact'].indexOf(step) ? 'bg-brand-black dark:bg-white' : 'bg-gray-200 dark:bg-[#2A2A2C]'].join(' ')} />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1 — Service */}
      {step === 'service' && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold text-brand-black dark:text-white">Quel service souhaitez-vous ?</h1>
          <ServiceSelector value={service} onChange={(s) => { setService(s); setStep('addresses') }} />
        </div>
      )}

      {/* STEP 2 — Addresses */}
      {step === 'addresses' && service && (
        <div className="flex flex-col gap-5">
          <button onClick={() => setStep('service')} className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 self-start">
            ← Changer de service
          </button>
          <h1 className="text-2xl font-black text-brand-black dark:text-white">
            {service === 'taxi' ? 'Votre trajet' : service === 'colis' ? 'Livraison de colis' : 'Votre commande de courses'}
          </h1>

          {/* Carte toujours visible — centrée sur l'utilisateur dès le départ */}
          {service !== 'courses' && (
            <div className="mb-[-44px]">
              <LeafletMap
                pickup={pickup}
                dropoff={dropoff}
                onPickupChange={setPickup}
                onDropoffChange={setDropoff}
                userPosition={userPosition}
                userLabel={userLabel}
              />
            </div>
          )}

          {/* Carte adresses — tap pour ouvrir le modal de recherche */}
          {/* z-[1000] : Leaflet utilise jusqu'à 800 pour ses contrôles */}
          <div className="relative z-[1000] bg-white dark:bg-[#141416] rounded-2xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#1E1E20] overflow-hidden">

            {/* Ligne Départ */}
            <div className="flex items-center min-h-[56px]">
              <div
                role="button"
                tabIndex={0}
                aria-label="Saisir le point de départ"
                onClick={() => setSearchModal({ activeField: 'pickup' })}
                onKeyDown={(e) => e.key === 'Enter' && setSearchModal({ activeField: 'pickup' })}
                className="flex-1 flex items-center min-h-[56px] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A1A1C] active:bg-gray-100 dark:active:bg-[#1E1E20] transition-colors"
              >
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  <IconMapPin
                    size={20}
                    className={pickup ? 'text-brand-red' : 'text-gray-300 dark:text-gray-600'}
                  />
                </div>
                <div className="flex-1 min-w-0 py-3.5 pr-3">
                  {pickup ? (
                    <span className="text-sm font-medium text-brand-black dark:text-white truncate block">{pickup.label}</span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      {service === 'colis' ? 'Point de récupération' :
                       service === 'courses' ? 'Adresse de livraison' :
                       "D'où partez-vous ?"}
                    </span>
                  )}
                </div>
              </div>
              {/* Bouton géoloc — séparé pour éviter les boutons imbriqués */}
              <div className="flex items-center pr-3.5">
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={geolocating}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-brand-red dark:hover:text-brand-red hover:bg-red-50 dark:hover:bg-brand-red/10 transition-colors disabled:opacity-40 flex-shrink-0"
                  aria-label="Détecter ma position"
                  title="Ma position actuelle"
                >
                  {geolocating
                    ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                    : <IconLocation size={17} />}
                </button>
              </div>
            </div>

            {/* Erreur géoloc */}
            {geoError && (
              <p role="alert" className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800/40 px-4 py-2">
                {geoError}
              </p>
            )}

            {/* Ligne Arrivée */}
            {service !== 'courses' && (
              <div
                role="button"
                tabIndex={0}
                aria-label="Saisir la destination"
                onClick={() => setSearchModal({ activeField: 'dropoff' })}
                onKeyDown={(e) => e.key === 'Enter' && setSearchModal({ activeField: 'dropoff' })}
                className="flex items-center min-h-[56px] border-t border-gray-100 dark:border-[#1E1E20] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A1A1C] active:bg-gray-100 dark:active:bg-[#1E1E20] transition-colors"
              >
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  <IconMapPin
                    size={20}
                    className={dropoff ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}
                  />
                </div>
                <div className="flex-1 min-w-0 py-3.5 pr-4">
                  {dropoff ? (
                    <span className="text-sm font-medium text-brand-black dark:text-white truncate block">{dropoff.label}</span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      {service === 'colis' ? 'Point de livraison' : "Où voulez-vous aller ?"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal de recherche plein écran */}
          {searchModal && (
            <SearchModal
              activeField={searchModal.activeField}
              pickup={pickup}
              dropoff={dropoff}
              onPickupChange={setPickup}
              onDropoffChange={setDropoff}
              onClose={() => setSearchModal(null)}
              pickupPlaceholder={
                service === 'colis' ? 'Point de récupération' :
                service === 'courses' ? 'Adresse de livraison' :
                "D'où partez-vous ?"
              }
              dropoffPlaceholder={
                service === 'colis' ? 'Point de livraison' :
                "Où voulez-vous aller ?"
              }
              showDropoff={service !== 'courses'}
            />
          )}

          {/* Options colis */}
          {service === 'colis' && (
            <div className="flex flex-col gap-4">
              {/* Type de colis */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-brand-black dark:text-white">Type de colis</p>
                <div className="grid grid-cols-2 gap-2">
                  {COLIS_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setColisType(t.value)}
                      className={[
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left',
                        colisType === t.value
                          ? 'border-brand-red bg-red-50 dark:bg-brand-red/10 text-brand-red'
                          : 'border-gray-200 dark:border-[#2A2A2C] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:bg-[#1C1C1E]',
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                )}
              </div>

              {/* Taille */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-brand-black dark:text-white">Taille du colis</p>
                <div className="flex gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setColisSize(s)}
                      className={[
                        'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                        colisSize === s
                          ? 'border-brand-red bg-red-50 dark:bg-brand-red/10 text-brand-red'
                          : 'border-gray-200 dark:border-[#2A2A2C] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:bg-[#1C1C1E]',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantité */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-brand-black dark:text-white">Quantité</span>
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setColisQty(Math.max(1, colisQty - 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white flex items-center justify-center font-bold text-lg hover:border-brand-red transition-colors"
                    aria-label="Diminuer"
                  >−</button>
                  <span className="text-lg font-bold w-6 text-center">{colisQty}</span>
                  <button
                    type="button"
                    onClick={() => setColisQty(Math.min(10, colisQty + 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white flex items-center justify-center font-bold text-lg hover:border-brand-red transition-colors"
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
                <p className="text-sm font-medium text-brand-black dark:text-white">Type de courses</p>
                <div className="grid grid-cols-2 gap-2">
                  {COURSES_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setCoursesType(t.value)}
                      className={[
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left',
                        coursesType === t.value
                          ? 'border-brand-red bg-red-50 dark:bg-brand-red/10 text-brand-red'
                          : 'border-gray-200 dark:border-[#2A2A2C] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:bg-[#1C1C1E]',
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-brand-black dark:text-white" htmlFor="quartier">Quartier de livraison</label>
                <input
                  id="quartier"
                  type="text"
                  value={coursesQuartier}
                  onChange={(e) => setCoursesQuartier(e.target.value)}
                  placeholder="Ex : Analakely, Ivandry…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-brand-black dark:text-white" htmlFor="description">Liste de courses détaillée</label>
                <textarea
                  id="description"
                  value={coursesDesc}
                  onChange={(e) => setCoursesDesc(e.target.value)}
                  placeholder="Ex : 2 bouteilles d'eau, pain, tomates, savon…"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base resize-none placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          )}

          {/* Date/heure de récupération — taxi et colis uniquement */}
          {(service === 'taxi' || service === 'colis') && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-brand-black dark:text-white">Quand souhaitez-vous être pris en charge ?</p>
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
                        ? 'border-brand-red bg-red-50 dark:bg-brand-red/10 text-brand-red'
                        : 'border-gray-200 dark:border-[#2A2A2C] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:bg-[#1C1C1E]',
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
                  min={(() => { const d = new Date(Date.now() + 10 * 60000); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` })()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12 placeholder-gray-400 dark:placeholder-gray-500"
                />
              )}
            </div>
          )}

          {estimateError && (
            <p role="alert" className="text-sm text-brand-red bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
              {estimateError}
            </p>
          )}

          {needsDatetime && !pickupDatetime && (
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
              Choisissez une date et heure de prise en charge
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
          <button onClick={() => setStep('addresses')} className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            ← Modifier les adresses
          </button>
          <h1 className="text-xl font-bold text-brand-black dark:text-white">Votre estimation</h1>

          {/* Récapitulatif trajet */}
          {pickup && (
            <div className="bg-white dark:bg-[#141416] rounded-2xl border border-gray-100 dark:border-[#2A2A2C] shadow-sm dark:shadow-black/20 px-4 py-4">
              {/* Départ → Arrivée */}
              <div className="flex items-stretch gap-3">
                {/* Timeline */}
                <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-red ring-2 ring-red-100 dark:ring-brand-red/20" />
                  {dropoff && <div className="w-px flex-1 bg-gray-200 dark:bg-[#2A2A2C] my-1.5" />}
                  {dropoff && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100 dark:ring-blue-500/20" />}
                </div>
                {/* Labels */}
                <div className="flex flex-col flex-1 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Départ</p>
                    <p className="text-sm font-medium text-brand-black dark:text-white leading-snug line-clamp-2">{pickup.label}</p>
                  </div>
                  {dropoff && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Arrivée</p>
                      <p className="text-sm font-medium text-brand-black dark:text-white leading-snug line-clamp-2">{dropoff.label}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date de récupération — taxi & colis uniquement */}
              {(service === 'taxi' || service === 'colis') && (
                <>
                  <div className="border-t border-gray-100 dark:border-[#2A2A2C] mt-3.5 mb-3" />
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-brand-gray dark:bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Prise en charge</p>
                      {pickupSchedule === 'now' ? (
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">Maintenant</p>
                      ) : (
                        <p className="text-sm font-semibold text-brand-black dark:text-white">
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
          <button onClick={() => setStep('estimate')} className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            ← Retour
          </button>
          <h1 className="text-xl font-bold text-brand-black dark:text-white">Vos coordonnées</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Nous vous appellerons pour confirmer.</p>
          {submitError && (
            <p role="alert" className="text-sm text-brand-red bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
              {submitError}
            </p>
          )}
          <ContactForm onSubmit={handleSubmit} loading={submitting} />
        </div>
      )}

      {/* Annulation enregistrée */}
      {step === 'cancelled' && (
        <div className="flex flex-col items-center text-center gap-6 py-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1C1C1E] flex items-center justify-center text-2xl text-gray-500 dark:text-gray-400">
            ✕
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-brand-black dark:text-white">Commande annulée</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
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
          customerName={customerName}
          pickup={pickup}
          dropoff={dropoff}
          price={estimate?.price ?? null}
          accessCode={accessCode}
        />
      )}
    </div>
  )
}
