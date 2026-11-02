import { Link, useNavigate } from 'react-router-dom'
import { LoginForm, useAuth } from '@/features/auth'
import { AuthLayout } from '../layout/AuthLayout'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { sessionExpired } = useAuth()

  return (
    <AuthLayout
      heading="Qué bueno verte de nuevo"
      title="Inicia sesión"
      footer={
        <>
          ¿Aún no tienes cuenta? <Link to="/register">Regístrate</Link>
        </>
      }
    >
      {sessionExpired && (
        <p className="login-notice" role="status">
          Tu sesión expiró. Inicia sesión de nuevo para continuar.
        </p>
      )}
      <LoginForm onSuccess={() => navigate('/', { replace: true })} />
    </AuthLayout>
  )
}
