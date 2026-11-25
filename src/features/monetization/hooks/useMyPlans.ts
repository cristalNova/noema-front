import { useEffect, useRef, useState } from 'react'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { deletePlan, listAllMyPlans, updatePlan, type Plan } from '../api/plansApi'
import { getPlanActionError } from '../model/planForm'

/** Planes que administra el usuario, activos o no, con las acciones de la lista. */
export function useMyPlans() {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const pending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    listAllMyPlans(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setPlans(data)
        setLoadError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(reason))
      })
    return () => controller.abort()
  }, [attempt])

  async function toggleActive(plan: Plan) {
    if (pending.current) return
    pending.current = true
    setPendingId(plan.id)
    setNotice('')
    setActionError('')
    try {
      const saved = await updatePlan(plan.id, { isActive: !plan.isActive })
      setPlans((previous) => (previous ?? []).map((item) => (item.id === plan.id ? { ...item, isActive: saved.isActive } : item)))
      setNotice(saved.isActive ? `“${plan.name}” está activo y admite suscripciones.` : `“${plan.name}” está inactivo: no admite suscripciones nuevas.`)
    } catch (reason) {
      setActionError(getPlanActionError(reason))
    } finally {
      pending.current = false
      setPendingId(null)
    }
  }

  /** Devuelve el mensaje de error para mostrarlo en el diálogo, o null si terminó bien. */
  async function remove(plan: Plan): Promise<string | null> {
    if (pending.current) return 'Hay otra operación en curso. Intenta de nuevo.'
    pending.current = true
    setPendingId(plan.id)
    setNotice('')
    setActionError('')
    try {
      await deletePlan(plan.id)
    } catch (reason) {
      // Si ya no existe (se borró en otra pestaña), el resultado es el que se buscaba.
      if (toApiError(reason).status !== 404) return getPlanActionError(reason)
    } finally {
      pending.current = false
      setPendingId(null)
    }
    setPlans((previous) => (previous ?? []).filter((item) => item.id !== plan.id))
    setNotice(`Se eliminó “${plan.name}”.`)
    return null
  }

  return {
    plans: plans ?? [],
    isLoading: plans === null && !loadError,
    loadError,
    retry: () => {
      setLoadError('')
      setAttempt((value) => value + 1)
    },
    pendingId,
    notice,
    actionError,
    toggleActive,
    remove,
  }
}
