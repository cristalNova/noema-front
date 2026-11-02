import { Link, useNavigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth'
import { AuthLayout } from '../layout/AuthLayout'

export default function LoginPage() {
  const navigate = useNavigate()

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
      <LoginForm onSuccess={() => navigate('/', { replace: true })} />
    </AuthLayout>
  )
}
