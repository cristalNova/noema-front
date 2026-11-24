import { useState, type FormEvent } from 'react'
import { TextField } from '@/shared/components/TextField'
import { createPermission, updatePermission, type AdminPermission } from '../api/permissionsApi'
import { describeAdminError } from '../model/adminErrors'
import { isSystemPermission, validatePermissionName } from '../model/permissionsCatalog'

interface PermissionFormProps {
  /** null = crear un permiso nuevo. */
  permission: AdminPermission | null
  onSaved: (message: string) => void
  onCancel: () => void
}

export function PermissionForm({ permission, onSaved, onCancel }: PermissionFormProps) {
  const [name, setName] = useState(permission?.permissionName ?? '')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = permission !== null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')

    const problem = validatePermissionName(name)
    setFieldError(problem)
    if (problem) return

    const trimmed = name.trim()
    if (permission && trimmed === permission.permissionName) {
      setFormError('No hay cambios que guardar.')
      return
    }

    setIsSaving(true)
    try {
      if (permission) await updatePermission(permission.id, trimmed)
      else await createPermission(trimmed)
      if (!permission) setName('')
      onSaved(permission ? `Permiso «${trimmed}» actualizado.` : `Permiso «${trimmed}» creado.`)
    } catch (reason) {
      setFormError(describeAdminError(reason)) // incluye el 409 de nombre duplicado
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="admin-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <TextField
        label="Nombre del permiso"
        value={name}
        error={fieldError || undefined}
        hint="Debe ser único. Máximo 50 caracteres."
        autoFocus={isEditing}
        onChange={(event) => setName(event.target.value)}
      />
      {permission && isSystemPermission(permission.permissionName) && (
        <p className="admin-warning" role="note">
          Este permiso lo usa el panel de administración. Si le cambias el nombre, dejará de dar acceso.
        </p>
      )}
      {formError && <p className="admin-form__error" role="alert">{formError}</p>}
      <div className="admin-actions">
        <button type="submit" className="button button--primary" disabled={isSaving}>
          {isSaving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear permiso'}
        </button>
        {isEditing && (
          <button type="button" className="button button--secondary" disabled={isSaving} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}