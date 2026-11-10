import { expect, test, type Page } from '@playwright/test'

const community = {
  id: 1,
  ownerId: 7,
  owner: { id: 7, name: 'María López', profilePhoto: null },
  name: 'Club de lectura contemporánea',
  topic: 'Literatura',
  description: 'Lecturas y conversaciones.',
  isPremium: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  memberCount: 3,
}

type MemberFixture = { profileId: number; role: 'MEMBER' | 'MODERATOR' | 'OWNER'; name: string; username: string }

const members: MemberFixture[] = [
  { profileId: 7, role: 'OWNER', name: 'María López', username: 'maria' },
  { profileId: 8, role: 'MODERATOR', name: 'Luis Pérez', username: 'luis' },
  { profileId: 9, role: 'MEMBER', name: 'Ana Gómez', username: 'ana' },
]

const pendingMember: MemberFixture = {
  profileId: 10,
  role: 'MEMBER',
  name: 'Sofía Ruiz',
  username: 'sofia',
}
const pendingMemberTwo: MemberFixture = {
  profileId: 11,
  role: 'MEMBER',
  name: 'Diego León',
  username: 'diego',
}
const bannedMember: MemberFixture = {
  profileId: 12,
  role: 'MEMBER',
  name: 'Elena Mora',
  username: 'elena',
}

const tokenFor = (userId: string) => {
  const payload = btoa(JSON.stringify({
    sub: userId,
    email: 'e2e@example.test',
    roles: [],
    permissions: [],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }))
  return `header.${payload}.signature`
}

function membership(member: MemberFixture, status: 'ACTIVE' | 'PENDING' | 'BANNED') {
  return {
    profileId: member.profileId,
    communityId: 1,
    role: member.role,
    status,
    joinedAt: '2026-01-02T00:00:00.000Z',
    profile: {
      id: member.profileId,
      name: member.name,
      username: member.username,
      profilePhoto: null,
    },
  }
}

async function mockMembersPage(page: Page, userId: string) {
  const memberRecords = members.map((member) => membership(member, 'ACTIVE'))
  memberRecords.push(membership(pendingMember, 'PENDING'))
  memberRecords.push(membership(pendingMemberTwo, 'PENDING'))
  memberRecords.push(membership(bannedMember, 'BANNED'))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor(userId))
  await page.route('**/profiles/me', (route) =>
    route.fulfill({ json: { id: Number(userId), username: 'user', name: 'User' } }),
  )
  await page.route('**/notifications/unread-count', (route) =>
    route.fulfill({ json: { count: 0 } }),
  )
  await page.route('**/communities/1', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: community })
  })
  await page.route('**/articles**', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } })
  })
  await page.route('**/posts**', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } })
  })
  await page.route('**/profiles/8', (route) => route.fulfill({
    json: { id: 8, username: 'luis', name: 'Luis Pérez', profilePhoto: null },
  }))
  await page.route('**/communities/1/members**', async (route) => {
    const request = route.request()
    const url = new URL(route.request().url())
    const profileId = Number(url.pathname.split('/').pop())
    const status = url.searchParams.get('status') ?? 'ACTIVE'
    const pageNumber = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '1')
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as { role?: string; status?: string }
      const target = memberRecords.find((member) => member.profileId === profileId)
      if (!target) {
        await route.fulfill({ status: 404, json: { message: 'Miembro no encontrado' } })
        return
      }
      Object.assign(target, body)
      await route.fulfill({ json: target })
      return
    }
    if (request.method() === 'DELETE') {
      const index = memberRecords.findIndex((member) => member.profileId === profileId)
      if (index >= 0) memberRecords.splice(index, 1)
      await route.fulfill({ status: 204 })
      return
    }
    if (userId === '9' && status !== 'ACTIVE') {
      await route.fulfill({ status: 403, json: { message: 'No autorizado' } })
      return
    }
    const statusMembers = memberRecords.filter((member) => member.status === status)
    const pageItems = statusMembers.slice((pageNumber - 1) * limit, pageNumber * limit)
    await route.fulfill({
      json: {
        data: pageItems,
        total: statusMembers.length,
        page: pageNumber,
        limit,
      },
    })
  })
}

test('owner can filter members, paginate, and navigate to the correct profile', async ({ page }) => {
  await mockMembersPage(page, '7')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()

  await expect(page.getByRole('link', { name: 'Ver perfil de María López' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Miembros de la comunidad' }).getByText('Propietario')).toBeVisible()
  await expect(page.locator('time[datetime="2026-01-02T00:00:00.000Z"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('link', { name: 'Ver perfil de Luis Pérez' })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Anterior' })).toBeEnabled()
  await page.getByRole('button', { name: 'Pendientes' }).click()
  await expect(page.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('link', { name: 'Ver perfil de Sofía Ruiz' })).toBeAttached()
  await page.getByRole('button', { name: 'Activos' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()
})

test('member profile links navigate to the selected public profile', async ({ page }) => {
  await mockMembersPage(page, '9')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()
  await page.getByRole('link', { name: 'Ver perfil de María López' }).click()
  await expect(page).toHaveURL(/\/profiles\/7$/)
})

test('normal member only sees active members and API rejects privileged statuses', async ({ page }) => {
  await mockMembersPage(page, '9')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()

  await expect(page.getByRole('button', { name: 'Activos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pendientes' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Vetados' })).toHaveCount(0)
  const statuses = await page.evaluate(async () => Promise.all(
    ['PENDING', 'BANNED'].map(async (status) => {
      const response = await fetch(`/communities/1/members?status=${status}`)
      return response.status
    }),
  ))
  expect(statuses).toEqual([403, 403])
})

test('moderator can access pending and banned member filters', async ({ page }) => {
  await mockMembersPage(page, '8')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()

  await expect(page.getByRole('button', { name: 'Pendientes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vetados' })).toBeVisible()
  await page.getByRole('button', { name: 'Vetados' }).click()
  await expect(page.getByRole('button', { name: 'Quitar veto' })).toBeVisible()
})

test('owner confirms moderation actions and updates rows without reloading', async ({ page }) => {
  await mockMembersPage(page, '7')
  let patches = 0
  await page.route('**/communities/1/members/9', async (route) => {
    if (route.request().method() === 'PATCH') patches += 1
    await route.fallback()
  })
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()

  const memberRow = page.getByRole('list', { name: 'Miembros de la comunidad' })
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await memberRow.getByRole('button', { name: 'Promover a moderador' }).click()
  await expect(page.getByRole('dialog')).toContainText('obtendrá permisos de moderación')
  await page.getByRole('dialog').getByRole('button', { name: 'Promover' }).click()
  await expect(memberRow.getByText('Moderador', { exact: true })).toBeVisible()
  expect(patches).toBe(1)

  await memberRow.getByRole('button', { name: 'Vetar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Vetar' }).click()
  await expect(memberRow.getByText('Ana Gómez')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('vetado')
})

test('owner can expel an active member and updates the counter without reloading', async ({ page }) => {
  await mockMembersPage(page, '7')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()

  await expect(page.getByRole('link', { name: 'Ver perfil de Luis Pérez' })).toBeAttached()
  await page.getByRole('button', { name: 'Expulsar' }).click()
  await expect(page.getByRole('dialog')).toContainText('dejará de formar parte')
  await page.getByRole('dialog').getByRole('button', { name: 'Expulsar' }).click()

  await expect(page.getByText('2', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Miembros de la comunidad' }).getByText('Luis Pérez')).toHaveCount(0)
  await expect(page.getByText('Luis Pérez ha sido expulsado de la comunidad.')).toBeVisible()
})

test('owner can reject and approve pending requests using the real mutation endpoints', async ({ page }) => {
  await mockMembersPage(page, '7')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()
  await page.getByRole('button', { name: 'Pendientes' }).click()

  await expect(page.getByRole('link', { name: 'Ver perfil de Sofía Ruiz' })).toBeAttached()
  await page.getByRole('button', { name: 'Rechazar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Rechazar' }).click()
  await expect(page.getByRole('link', { name: 'Ver perfil de Diego León' })).toBeAttached()

  await page.getByRole('button', { name: 'Aprobar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Aprobar' }).click()
  await expect(page.getByRole('button', { name: 'Activos' })).toHaveAttribute('aria-pressed', 'true')
})

test('owner can remove a ban and return the member to active list', async ({ page }) => {
  await mockMembersPage(page, '7')
  await page.goto('/communities/1')
  await page.getByRole('tab', { name: /Miembros/ }).click()
  await page.getByRole('button', { name: 'Vetados' }).click()

  await expect(page.getByRole('link', { name: 'Ver perfil de Elena Mora' })).toBeAttached()
  await page.getByRole('button', { name: 'Quitar veto' }).click()
  await expect(page.getByRole('dialog')).toContainText('volverá a ser un miembro activo')
  await page.getByRole('dialog').getByRole('button', { name: 'Quitar veto' }).click()

  await expect(page.getByRole('button', { name: 'Activos' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Se quitó el veto a Elena Mora.')).toBeVisible()
})
