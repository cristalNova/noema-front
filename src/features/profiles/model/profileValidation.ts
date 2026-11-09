import type { NewProfile, Profile, ProfileChanges } from './Profile'

export const SOCIAL_NETWORKS = [
  { key: 'twitter', label: 'X / Twitter' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'github', label: 'GitHub' },
] as const

export interface ProfileFormValues {
  username: string
  name: string
  bio: string
  photoUrl: string
  website: string
  twitter: string
  instagram: string
  linkedin: string
  github: string
}

export type ProfileField = keyof ProfileFormValues
export type ProfileErrors = Partial<Record<ProfileField, string>>

export const USERNAME_MIN = 3
export const USERNAME_MAX = 50
export const NAME_MAX = 100
export const BIO_MAX = 500
export const PHOTO_MAX = 500
export const WEBSITE_MAX = 255

const USERNAME_RE = /^[a-zA-Z0-9_.]+$/

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  username: '',
  name: '',
  bio: '',
  photoUrl: '',
  website: '',
  twitter: '',
  instagram: '',
  linkedin: '',
  github: '',
}

/** Acepta "sitio.com" y lo normaliza a "https://sitio.com". Devuelve null si no es una URL web válida. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    const valid = /^https?:$/.test(url.protocol) && url.hostname.includes('.')
    return valid ? candidate : null
  } catch {
    return null
  }
}

export function validateProfile(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {}
  const username = values.username.trim()
  const name = values.name.trim()

  if (!username) errors.username = 'El nombre de usuario es requerido'
  else if (username.length < USERNAME_MIN)
    errors.username = `Debe tener al menos ${USERNAME_MIN} caracteres`
  else if (username.length > USERNAME_MAX)
    errors.username = `No puede exceder ${USERNAME_MAX} caracteres`
  else if (!USERNAME_RE.test(username)) errors.username = 'Solo letras, números, guion bajo y punto'

  if (!name) errors.name = 'El nombre es requerido'
  else if (name.length > NAME_MAX) errors.name = `No puede exceder ${NAME_MAX} caracteres`

  if (values.bio.trim().length > BIO_MAX) errors.bio = `No puede exceder ${BIO_MAX} caracteres`

  const urlFields: [ProfileField, number | null][] = [
    ['photoUrl', PHOTO_MAX],
    ['website', WEBSITE_MAX],
    ...SOCIAL_NETWORKS.map(({ key }): [ProfileField, null] => [key, null]),
  ]
  for (const [field, max] of urlFields) {
    const raw = values[field].trim()
    if (!raw) continue
    const url = normalizeUrl(raw)
    if (!url) errors[field] = 'Ingresa una URL válida (por ejemplo, https://sitio.com)'
    else if (max && url.length > max) errors[field] = `No puede exceder ${max} caracteres`
  }

  return errors
}

/** Convierte el formulario (ya validado) en la entidad a crear; omite lo vacío. */
export function toNewProfile(values: ProfileFormValues): NewProfile {
  const optionalUrl = (raw: string) => (raw.trim() ? (normalizeUrl(raw) ?? undefined) : undefined)

  const socialLinks: Record<string, string> = {}
  for (const { key } of SOCIAL_NETWORKS) {
    const url = optionalUrl(values[key])
    if (url) socialLinks[key] = url
  }

  return {
    username: values.username.trim(),
    name: values.name.trim(),
    photoUrl: optionalUrl(values.photoUrl),
    bio: values.bio.trim() || undefined,
    website: optionalUrl(values.website),
    socialLinks,
  }
}

/** Valores iniciales del formulario de edición a partir del perfil actual. */
export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    username: profile.username,
    name: profile.name,
    bio: profile.bio ?? '',
    photoUrl: profile.photoUrl ?? '',
    website: profile.website ?? '',
    twitter: profile.socialLinks.twitter ?? '',
    instagram: profile.socialLinks.instagram ?? '',
    linkedin: profile.socialLinks.linkedin ?? '',
    github: profile.socialLinks.github ?? '',
  }
}

/** Como validateProfile, pero sin el username: en la edición no se puede cambiar. */
export function validateProfileEdit(values: ProfileFormValues): ProfileErrors {
  const errors = validateProfile(values)
  delete errors.username
  return errors
}

/**
 * Formulario (ya validado) → cambios. Lo vacío pasa a null para que el servidor lo borre.
 * Las redes que el formulario no maneja (creadas desde otro cliente) se conservan.
 */
export function toProfileChanges(values: ProfileFormValues, current: Profile): ProfileChanges {
  const optionalUrl = (raw: string) => (raw.trim() ? normalizeUrl(raw) : null)

  const known = new Set<string>(SOCIAL_NETWORKS.map(({ key }) => key))
  const socialLinks: Record<string, string> = {}
  for (const [network, url] of Object.entries(current.socialLinks)) {
    if (!known.has(network)) socialLinks[network] = url
  }
  for (const { key } of SOCIAL_NETWORKS) {
    const url = optionalUrl(values[key])
    if (url) socialLinks[key] = url
  }

  return {
    name: values.name.trim(),
    photoUrl: optionalUrl(values.photoUrl),
    bio: values.bio.trim() || null,
    website: optionalUrl(values.website),
    socialLinks,
  }
}
