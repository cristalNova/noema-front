import { toApiError } from '@/shared/api/apiError'
import type { BillingPeriod, CreatePlanInput, Plan } from '../api/plansApi'

export const PLAN_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL', 'GBP']

const NAME_MAX_LENGTH = 100
const PRICE_MAX = 99_999_999.99

export interface PlanFormValues {
  name: string
  price: string
  currency: string
  billingPeriod: BillingPeriod
  /** Vacío: plan de autor. */
  communityId: string
}

export type PlanField = keyof PlanFormValues
export type PlanFormErrors = Partial<Record<PlanField, string>>

export const EMPTY_PLAN_FORM: PlanFormValues = { name: '', price: '', currency: 'COP', billingPeriod: 'MONTHLY', communityId: '' }

export function toPlanFormValues(plan: Plan): PlanFormValues {
  return {
    name: plan.name,
    price: String(plan.price),
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    communityId: plan.communityId === null ? '' : String(plan.communityId),
  }
}

/** Acepta la coma decimal habitual en español. */
function parsePrice(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : null
}

export function validatePlanForm(values: PlanFormValues): PlanFormErrors {
  const errors: PlanFormErrors = {}
  const name = values.name.trim()
  if (!name) errors.name = 'El nombre es obligatorio'
  else if (name.length > NAME_MAX_LENGTH) errors.name = `El nombre no puede exceder ${NAME_MAX_LENGTH} caracteres`

  const price = parsePrice(values.price)
  if (!values.price.trim()) errors.price = 'El precio es obligatorio'
  else if (price === null) errors.price = 'Escribe un número con máximo 2 decimales y sin separador de miles, por ejemplo 4500,50'
  else if (price < 0.01) errors.price = 'El precio mínimo es 0,01'
  else if (price > PRICE_MAX) errors.price = 'El precio es demasiado alto'
  return errors
}

export function toCreatePlanInput(values: PlanFormValues): CreatePlanInput {
  return {
    name: values.name.trim(),
    price: parsePrice(values.price) as number,
    currency: values.currency,
    billingPeriod: values.billingPeriod,
    ...(values.communityId ? { communityId: Number(values.communityId) } : {}),
  }
}

const NO_PERMISSION = 'No tienes permiso para gestionar este plan. Solo pueden hacerlo su autor o quien es propietario de la comunidad.'

const FIELD_PATTERNS: [PlanField, RegExp][] = [
  ['name', /\bname\b|nombre/i],
  ['price', /\bprice\b|precio/i],
  ['currency', /\bcurrency\b|moneda/i],
  ['billingPeriod', /\bbillingPeriod\b|periodo/i],
  ['communityId', /\bcommunityId\b|comunidad/i],
]

/** Reparte los mensajes del backend por campo; los que no corresponden a ninguno quedan como generales. */
export function getPlanFormErrors(error: unknown): { fields: PlanFormErrors; general: string[] } {
  const { status, messages } = toApiError(error)
  if (status === 403) {
    return { fields: {}, general: ['No tienes permiso para crear o editar este plan. En una comunidad, solo puede hacerlo quien es su propietario.'] }
  }
  const fields: PlanFormErrors = {}
  const general: string[] = []
  for (const message of messages) {
    const field = FIELD_PATTERNS.find(([, pattern]) => pattern.test(message))?.[0]
    if (field && !fields[field]) fields[field] = message
    else general.push(message)
  }
  return { fields, general }
}

/** Mensaje para activar, desactivar o eliminar un plan desde la lista. */
export function getPlanActionError(error: unknown): string {
  const { status, message } = toApiError(error)
  if (status === 403) return NO_PERMISSION
  // El mensaje del backend menciona el campo isActive: se traduce a lo que la persona puede hacer.
  if (status === 409) return 'Este plan tiene suscripciones y no se puede eliminar. Puedes desactivarlo para que no admita nuevas.'
  return message
}
