import { expect, test } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(async ({ page }) => {
  await mockBackgroundApis(page)
  // El inicio carga las lecturas recientes: sin esto llegarían al backend real.
  await page.route((url) => url.pathname === '/articles', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 12 } })
  })
})

for (const [path, heading] of [['/login', '¡Qué bueno verte de nuevo!'], ['/register', 'Crea tu cuenta y empieza a escribir']] as const) {
  test(`${path} ofrece un botón para volver al inicio sin iniciar sesión`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
    await page.getByRole('link', { name: 'Volver al inicio' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Lee, escribe y comparte ideas' })).toBeVisible()
  })
}

test('el inicio de sesión y el registro se enlazan entre sí', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Regístrate' }).click()
  await expect(page).toHaveURL(/\/register$/)
  await page.getByRole('link', { name: 'Inicia sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
