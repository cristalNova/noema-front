import type { AdminUser } from '../api/usersApi'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function formatCreatedAt(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function roleNames(user: AdminUser): string[] {
  return user.userRoles.map((userRole) => userRole.role.roleName)
}

export interface UserFormValues {
  email: string
  phoneNumber: string
}

export interface UserFormErrors {
  email?: string
  phoneNumber?: string
}

export function validateUserForm(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {}
  const email = values.email.trim()
  if (!email) errors.email = 'El correo es obligatorio.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Ingresa un correo válido.'
  if (values.phoneNumber.trim().length > 20) errors.phoneNumber = 'El teléfono no puede exceder 20 caracteres.'
  return errors
}