import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth'
import { TextField } from '@/shared/components/TextField'
import type { AdminPermission } from '../api/permissionsApi'
import { createRole, updateRole, type AdminRole, type RoleInput } from '../api/rolesApi'
import { describeAdminError } from '../model/adminErrors'
import { permissionIdsOf, sameIds, validateRoleName } from '../model/rolesCatalog'

interface RoleFormProps {
  /** null = crear un rol nuevo. */
  role: AdminRole | null
  /** Catálogo completo, del que se eligen los permisos del rol. */
  permissions: AdminPermission[]
  onSaved: (message: string) => void
  onCancel: () => void
}

export function RoleForm({ role, permissions, onSaved, onCancel }: RoleFormProps) {
  const { session } = useAuth()
  const [name, setName] = useState(role?.roleName ?? '')
  const [selected, setSelected] = useState<Set<number>>(() => new Set(role ? permissionIdsOf(role) : []))
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = role !== null
  const isMine = role !== null && (session?.user.roles.includes(role.roleName) ?? false)

  function toggle(id: number) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')

    const problem = validateRoleName(name)
    setFieldError(problem)
    if (problem) return

    const trimmed = name.trim()
    const permissionIds = Array.from(selected)

    let changes: RoleInput | null = null
    if (role) {
      changes = {}
      if (trimmed !== role.roleName) changes.roleName = trimmed
      if (!sameIds(permissionIds, permissionIdsOf(role))) changes.permissionIds = permissionIds
      if (Object.keys(changes).length === 0) {
        setFormError('No hay cambios que guardar.')
        return
      }
    }

    setIsSaving(true)
    try {
      if (role && changes) {
        await updateRole(role.id, changes)
        onSaved(`Rol «${trimmed}» actualizado.`)
      } else {
        await createRole({ roleName: trimmed, permissionIds })
        setName('')
        setSelected(new Set())
        onSaved(`Rol «${trimmed}» creado.`)
      }
    } catch (reason) {
      setFormError(describeAdminError(reason)) // incluye el 409 de nombre duplicado
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="admin-form admin-form--wide" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <TextField
        label="Nombre del rol"
        value={name}
        error={fieldError || undefined}
        hint="Debe ser único. Máximo 50 caracteres."
        autoFocus={isEditing}
        onChange={(event) => setName(event.target.value)}
      />

      <fieldset className="admin-fieldset">
        <legend>Permisos del rol ({selected.size} seleccionados)</legend>
        {permissions.length === 0 ? (
          <p className="admin-muted">Todavía no hay permisos. Créalos primero en la sección Permisos.</p>
        ) : (
          <div className="admin-checklist">
            {permissions.map((permission) => (
              <label key={permission.id} className="admin-check">
                <input
                  type="checkbox"
                  checked={selected.has(permission.id)}
                  onChange={() => toggle(permission.id)}
                />
                <span>{permission.permissionName}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {isMine && (
        <p className="admin-warning" role="note">
          Este es uno de tus roles. Si le quitas permisos del panel de administración, perderás acceso a esas secciones.
        </p>
      )}
      {formError && <p className="admin-form__error" role="alert">{formError}</p>}

      <div className="admin-actions">
        <button type="submit" className="button button--primary" disabled={isSaving}>
          {isSaving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear rol'}
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