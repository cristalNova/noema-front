import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { TextField } from '@/shared/components/TextField'
import { useRegister } from '../hooks/useRegister'
import {
  PASSWORD_MIN,
  PHONE_MAX,
  type RegisterField,
  type RegisterValues,
} from '../model/registerValidation'
import './AuthForm.css'

interface RegisterFormProps {
  onSuccess: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register, loading, fieldErrors, formError, clearError } = useRegister()
  const [values, setValues] = useState<RegisterValues>({ email: '', password: '', phoneNumber: '' })

  function bind(field: RegisterField) {
    return {
      value: values[field],
      error: fieldErrors[field],
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setValues((prev) => ({ ...prev, [field]: e.target.value }))
        clearError(field)
      },
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (await register(values)) onSuccess()
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <TextField
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="tu@correo.com"
        {...bind('email')}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint={`Mínimo ${PASSWORD_MIN} caracteres`}
        {...bind('password')}
      />
      <TextField
        label="Teléfono (opcional)"
        type="tel"
        autoComplete="tel"
        maxLength={PHONE_MAX}
        placeholder="+57 300 000 0000"
        {...bind('phoneNumber')}
      />

      {formError && (
        <p className="auth-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" loading={loading}>
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
