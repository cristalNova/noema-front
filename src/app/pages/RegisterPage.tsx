import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RegisterForm } from '@/features/auth'
import { AuthLayout } from '../layout/AuthLayout'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <AuthLayout
      heading="Crea tu cuenta y empieza a escribir"
      title="Regístrate"
      footer={
        <>
          ¿Ya tienes cuenta? <Link to="/login" state={location.state}>Inicia sesión</Link>
        </>
      }
    >
      <RegisterForm onSuccess={() => navigate('/profile/new', { replace: true, state: location.state })} />
    </AuthLayout>
  )
}
