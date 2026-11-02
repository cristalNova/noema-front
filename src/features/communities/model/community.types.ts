export interface UserRole {
  userId: number
  roleId: number
  assignedAt: string
  user: User
  role: Role
}

export interface Permission {
  id: number
  permissionName: string
  rolePermissions: RolePermission[]
}

export interface RolePermission {
  roleId: number
  permissionId: number
  role: Role
  permission: Permission
}

export interface Role {
  id: number
  roleName: string
  rolePermissions: RolePermission[]
  userRoles: UserRole[]
}

export interface User {
  id: number
  email: string
  password: string
  phoneNumber?: string
  isActive: boolean
  createdAt: string
  userRoles: UserRole[]
}

export interface Profile {
  id: number
  userId: number
  username: string
  name: string
  profilePhoto?: string
  bio?: string
  website?: string
  socialLinks?: Record<string, string>
  isVerified: boolean
  followersCount: number
  createdAt: string
  user: User
}

export interface CommunityTag {
  communityId: number
  tag: string
  community: Community
}

export interface Community {
  id: number
  ownerId: number
  owner: Profile
  name: string
  topic: string
  description?: string
  isPremium: boolean
  createdAt: string
  tags: CommunityTag[]
}
