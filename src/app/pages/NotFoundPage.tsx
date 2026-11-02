import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="page-shell"><h1>Página no encontrada</h1><p>Vuelve al inicio para continuar explorando Noema.</p><Link className="button button--primary" to="/">Volver al inicio</Link></main>
}
