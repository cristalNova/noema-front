import { createBrowserRouter } from 'react-router-dom'

// Esqueleto: rutas públicas y privadas. Los guards (feature auth) se agregan después.
export const router = createBrowserRouter([
  { path: '/', element: <p>Noema</p> },
  { path: '/login', element: <p>Login (pendiente)</p> },
  {
    // Privadas: envolver con RequireAuth cuando exista.
    path: '/app',
    element: <p>Área privada (pendiente)</p>,
  },
  { path: '*', element: <p>No encontrado</p> },
])
