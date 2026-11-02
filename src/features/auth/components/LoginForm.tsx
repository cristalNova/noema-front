import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { TextField } from '@/shared/components/TextField'
import { useLogin } from '../hooks/useLogin'
import type { LoginField, LoginValues } from '../model/loginValidation'
import './AuthForm.css'

interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { submit, loading, fieldErrors, formError, clearError } = useLogin()
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' })

  function bind(field: LoginField) {
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
    if (await submit(values)) onSuccess()
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
        autoComplete="current-password"
        {...bind('password')}
      />

      {formError && (
        <p className="auth-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" loading={loading}>
        {loading ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  )
}
