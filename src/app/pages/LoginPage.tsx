import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getRestoreState, getReturnTo } from '@/shared/utils/navigation'
import { LoginForm, useAuth } from '@/features/auth'
import { AuthLayout } from '../layout/AuthLayout'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionExpired } = useAuth()

  return (
    <AuthLayout
      heading="Qué bueno verte de nuevo"
      title="Inicia sesión"
      footer={
        <>
          ¿Aún no tienes cuenta? <Link to="/register" state={location.state}>Regístrate</Link>
        </>
      }
    >
      {sessionExpired && (
        <p className="login-notice" role="status">
          Tu sesión expiró. Inicia sesión de nuevo para continuar.
        </p>
      )}
      <LoginForm onSuccess={() => navigate(getReturnTo(location.state), { replace: true, state: getRestoreState(location.state) })} />
    </AuthLayout>
  )
}
