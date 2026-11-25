import { Link } from 'react-router-dom'

export function AccessDenied() {
  return (
    <main className="page-shell">
      <h1>Acceso denegado</h1>
      <p role="alert">No tienes los permisos necesarios para ver esta sección.</p>
      <Link className="button button--primary" to="/">Volver al inicio</Link>
    </main>
  )
}