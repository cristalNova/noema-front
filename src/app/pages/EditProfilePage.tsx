import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { DeleteProfileDialog, EditProfileForm, useDeleteProfile, useMyProfile } from '@/features/profiles'
import './EditProfilePage.css'

export function EditProfilePage() {
  const { profile, setProfile } = useMyProfile()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { remove, pending } = useDeleteProfile()
  const [confirming, setConfirming] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  // RequireProfile garantiza el perfil en esta ruta; esto solo satisface al tipo.
  if (!profile) return null

  async function confirmDelete(): Promise<string | null> {
    const error = await remove()
    if (error) return error
    // El perfil ya no existe: cerrar la sesión (revoca el token) y volver al inicio público.
    await logout()
    navigate('/', { replace: true })
    return null
  }

  function closeDialog() {
    setConfirming(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }

  return (
    <main className="page-shell edit-profile">
      <header className="page-header">
        <p className="eyebrow">Noema · Tu cuenta</p>
        <h1>Editar perfil</h1>
        <p>Mantén al día cómo te ven quienes leen y escriben en Noema.</p>
      </header>

      <section className="edit-profile__sheet" aria-label="Datos del perfil">
        {/* Los cambios guardados se propagan por setProfile: la barra y el resto de la app los ven al instante. */}
        <EditProfileForm key={profile.id} profile={profile} onSaved={setProfile} />
      </section>

      <section className="edit-profile__danger" aria-labelledby="danger-title">
        <h2 id="danger-title">Eliminar perfil</h2>
        <p>Borra tu perfil y todo lo que has creado. Esta acción no se puede deshacer.</p>
        <button ref={trigger} type="button" className="edit-profile__delete" onClick={() => setConfirming(true)}>
          Eliminar perfil…
        </button>
      </section>

      {confirming && (
        <DeleteProfileDialog username={profile.username} pending={pending} onClose={closeDialog} onConfirm={confirmDelete} />
      )}
    </main>
  )
}
