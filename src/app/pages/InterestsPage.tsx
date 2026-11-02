import { Link } from 'react-router-dom'

// Placeholder: paso de selección de intereses (siguiente HU).
export default function InterestsPage() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>Elige tus intereses</h1>
      <p>Pendiente (siguiente HU).</p>
      <Link className="button button--primary" to="/">Continuar al inicio</Link>
    </section>
  )
}
