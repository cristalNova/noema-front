import type { NewProfile, Profile, ProfileChanges } from './Profile'
import type { CreateProfileRequestDto, ProfileResponseDto, UpdateProfileRequestDto } from './profileDto'

export function toProfile(dto: ProfileResponseDto): Profile {
  return {
    id: dto.id,
    username: dto.username,
    name: dto.name,
    photoUrl: dto.profilePhoto ?? null,
    bio: dto.bio ?? null,
    website: dto.website ?? null,
    socialLinks: dto.socialLinks ?? {},
    isVerified: dto.isVerified,
    followersCount: dto.followersCount,
  }
}

/** Solo incluye los opcionales con valor: el backend rechaza strings vacíos en URLs. */
export function toCreateProfileDto(profile: NewProfile): CreateProfileRequestDto {
  const dto: CreateProfileRequestDto = { username: profile.username, name: profile.name }
  if (profile.photoUrl) dto.profilePhoto = profile.photoUrl
  if (profile.bio) dto.bio = profile.bio
  if (profile.website) dto.website = profile.website
  if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0)
    dto.socialLinks = profile.socialLinks
  return dto
}

export function toUpdateProfileDto(changes: ProfileChanges): UpdateProfileRequestDto {
  return {
    name: changes.name,
    profilePhoto: changes.photoUrl,
    bio: changes.bio,
    website: changes.website,
    socialLinks: changes.socialLinks,
  }
}
