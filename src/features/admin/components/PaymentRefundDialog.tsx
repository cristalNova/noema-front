import type { Payment } from '@/features/monetization/api/paymentsApi'
import { formatAmount } from '@/features/monetization/model/payments'
import { refundPayment, type RefundedPayment } from '../api/adminPaymentsApi'
import { describeAdminError } from '../model/adminErrors'
import { ConfirmDialog } from './ConfirmDialog'

interface PaymentRefundDialogProps {
  payment: Payment
  planName: string | null
  onClose: () => void
  onRefunded: (refunded: RefundedPayment) => void
}

export function PaymentRefundDialog({ payment, planName, onClose, onRefunded }: PaymentRefundDialogProps) {
  async function confirm(): Promise<string | null> {
    try {
      onRefunded(await refundPayment(payment.id))
      return null
    } catch (reason) {
      return describeAdminError(reason) // si el servidor lo rechaza (409), se muestra su motivo
    }
  }

  const amount = formatAmount(payment)

  return (
    <ConfirmDialog
      title="¿Reembolsar pago?"
      confirmLabel={`Reembolsar ${amount}`}
      busyLabel="Reembolsando…"
      danger
      onClose={onClose}
      onConfirm={confirm}
    >
      <p>
        Vas a reembolsar <strong>{amount}</strong> del pago #{payment.id} (
        {planName ?? `suscripción #${payment.subscriptionId}`}).
      </p>
      <p>
        La suscripción asociada termina de inmediato y, si el plan es de una comunidad, la persona deja de ser
        miembro. <strong>No se puede deshacer desde el panel.</strong>
      </p>
    </ConfirmDialog>
  )
}