import { z } from 'zod'

export const PhoneSchema = z
  .string()
  .regex(/^03[0-9]{8}$/, 'Format attendu : 03XXXXXXXX')

export const CoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const LocationSchema = z.object({
  label: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geolocated: z.boolean().optional(),
})

export const EstimateSchema = z.object({
  service: z.enum(['taxi', 'colis', 'courses']),
  pickup: CoordsSchema,
  dropoff: CoordsSchema,
  details: z
    .object({
      size: z.enum(['petit', 'moyen', 'grand']).optional(),
      quantity: z.number().int().min(1).max(10).optional(),
    })
    .optional(),
})

export const OrderSchema = z.object({
  service: z.enum(['taxi', 'colis', 'courses']),
  customer_name: z.string().min(2).max(100),
  customer_phone: PhoneSchema,
  pickup: LocationSchema,
  dropoff: LocationSchema.optional(),
  decision: z.discriminatedUnion('type', [
    z.object({ type: z.literal('accepted') }),
    z.object({
      type: z.literal('counter'),
      counter_offer: z.number().int().min(500).max(500000),
    }),
  ]),
  details: z
    .object({
      size: z.enum(['petit', 'moyen', 'grand']).optional(),
      quantity: z.number().int().min(1).max(10).optional(),
      type_colis: z.string().max(100).optional(),
      pickup_schedule: z.enum(['now', 'later']).optional(),
      pickup_datetime: z.string().max(30).optional(),
      description: z.string().max(500).optional(),
      quartier: z.string().max(100).optional(),
      type_courses: z.string().max(100).optional(),
    })
    .optional(),
  honeypot: z.string().max(0),
})

export const StatusUpdateSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'done', 'cancelled']),
})
