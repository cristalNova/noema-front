import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TextField } from '@/shared/components/TextField'
import { createPlan, updatePlan, type BillingPeriod, type Plan } from '../api/plansApi'
import { useOwnedCommunities } from '../hooks/useOwnedCommunities'
import {
  EMPTY_PLAN_FORM,
  getPlanFormErrors,
  PLAN_CURRENCIES,
  toCreatePlanInput,
  toPlanFormValues,
  validatePlanForm,
  type PlanField,
  type PlanFormErrors,
} from '../model/planForm'
import './PlanForm.css'

interface PlanFormProps {
  /** Sin plan, el formulario crea uno nuevo. */
  plan?: Plan
  onSaved: (plan: Plan) => void
}

export function PlanForm({ plan, onSaved }: PlanFormProps) {
  const isEditing = plan !== undefined
  const owned = useOwnedCommunities()
  const [values, setValues] = useState(() => (plan ? toPlanFormValues(plan) : EMPTY_PLAN_FORM))
  const [errors, setErrors] = useState<PlanFormErrors>({})
  const [generalErrors, setGeneralErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const pending = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const selectedCommunity = owned.communities.find((community) => String(community.id) === values.communityId)

  function change(field: PlanField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setGeneralErrors([])
  }

  function showErrors(fields: PlanFormErrors, general: string[] = []) {
    setErrors(fields)
    setGeneralErrors(general)
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    const invalid = validatePlanForm(values)
    if (Object.keys(invalid).length > 0) return showErrors(invalid)

    pending.current = true
    setIsSaving(true)
    setGeneralErrors([])
    const input = toCreatePlanInput(values)
    try {
      // La moneda, el periodo y el titular no se pueden cambiar: afectarían a quienes ya pagaron.
      const saved = plan ? await updatePlan(plan.id, { name: input.name, price: input.price }) : await createPlan(input)
      onSaved(saved)
    } catch (reason) {
      const { fields, general } = getPlanFormErrors(reason)
      showErrors(fields, general)
    } finally {
      pending.current = false
      setIsSaving(false)
    }
  }

  return (
    <form ref={form} className="plan-form" noValidate aria-busy={isSaving} onSubmit={(event) => void submit(event)}>
      <TextField
        label="Nombre del plan"
        placeholder="Ej. Acceso mensual"
        value={values.name}
        error={errors.name}
        disabled={isSaving}
        onChange={(event) => change('name', event.target.value)}
      />

      <div className="plan-form__row">
        <TextField
          label="Precio"
          inputMode="decimal"
          placeholder="Ej. 4500,50"
          value={values.price}
          error={errors.price}
          disabled={isSaving}
          onChange={(event) => change('price', event.target.value)}
        />
        <label className="field">
          <span className="field__label">Moneda</span>
          <select
            className="field__input"
            value={values.currency}
            disabled={isEditing || isSaving}
            aria-invalid={errors.currency ? true : undefined}
            aria-describedby={errors.currency ? 'plan-currency-error' : undefined}
            onChange={(event) => change('currency', event.target.value)}
          >
            {/* Un plan creado por otra vía puede tener una moneda fuera de esta lista. */}
            {!PLAN_CURRENCIES.includes(values.currency) && <option value={values.currency}>{values.currency}</option>}
            {PLAN_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
          {errors.currency && <span id="plan-currency-error" className="field__msg field__msg--error">{errors.currency}</span>}
        </label>
      </div>

      <label className="field">
        <span className="field__label">Periodo de facturación</span>
        <select
          className="field__input"
          value={values.billingPeriod}
          disabled={isEditing || isSaving}
          aria-invalid={errors.billingPeriod ? true : undefined}
          aria-describedby={errors.billingPeriod ? 'plan-period-error' : undefined}
          onChange={(event) => change('billingPeriod', event.target.value as BillingPeriod)}
        >
          <option value="MONTHLY">Mensual</option>
          <option value="YEARLY">Anual</option>
        </select>
        {errors.billingPeriod && <span id="plan-period-error" className="field__msg field__msg--error">{errors.billingPeriod}</span>}
      </label>

      <label className="field">
        <span className="field__label">Asociar a</span>
        <select
          className="field__input"
          value={values.communityId}
          disabled={isEditing || isSaving || owned.isLoading}
          aria-invalid={errors.communityId ? true : undefined}
          aria-describedby={errors.communityId ? 'plan-community-error' : undefined}
          onChange={(event) => change('communityId', event.target.value)}
        >
          <option value="">Mis ensayos premium (plan de autor)</option>
          {values.communityId && !selectedCommunity && <option value={values.communityId}>Comunidad #{values.communityId}</option>}
          {owned.communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
        </select>
        {errors.communityId && <span id="plan-community-error" className="field__msg field__msg--error">{errors.communityId}</span>}
      </label>

      {owned.error && !isEditing && (
        <div className="plan-form__notice" role="alert">
          <p>No pudimos cargar tus comunidades. Puedes crear un plan de autor o volver a intentarlo.</p>
          <button type="button" className="button button--secondary" onClick={owned.retry}>Reintentar</button>
        </div>
      )}
      {!isEditing && !owned.isLoading && !owned.error && owned.communities.length === 0 && (
        <p className="plan-form__hint">Solo puedes asociar planes a comunidades de las que eres propietario.</p>
      )}
      {selectedCommunity && !selectedCommunity.isPremium && (
        <p className="plan-form__notice" role="status">
          <strong>{selectedCommunity.name}</strong> es gratuita: sus lectores no verán el acceso a los planes hasta que sea premium.
        </p>
      )}
      {isEditing && <p className="plan-form__hint">La moneda, el periodo y la asociación no se pueden cambiar porque afectarían a quienes ya pagaron. Si necesitas otros, desactiva este plan y crea uno nuevo.</p>}

      {generalErrors.length > 0 && (
        <div className="plan-form__error" role="alert">
          {generalErrors.map((message) => <p key={message}>{message}</p>)}
        </div>
      )}

      <div className="plan-form__actions">
        <Link className="button button--secondary" to="/app/plans">Cancelar</Link>
        <button type="submit" className="button button--primary" disabled={isSaving}>
          {isSaving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear plan'}
        </button>
      </div>
    </form>
  )
}
