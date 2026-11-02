import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import './HomePage.css'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { status, profile } = useMyProfile()
  return (
    <main className="home">
      <header className="home__intro">
        <p className="home__eyebrow">{profile ? `El espacio de ${profile.name}` : 'Un espacio para tus ideas'}</p>
        <h1>Lee, escribe y comparte ideas</h1>
        <p className="home__description">Encuentra una comunidad, retoma un ensayo o empieza con esa idea que tienes en mente.</p>
        <Link className="home__primary" to="/app/articles/new">Empezar a escribir <span aria-hidden="true">↗</span></Link>
        <Link className="home__read" to="/articles">Leer ensayos publicados →</Link>
      </header>

      {isAuthenticated && status === 'missing' && <aside className="home__profile"><div><strong>Tu espacio está casi listo.</strong><p>Crea tu perfil para guardar ensayos y participar con tu identidad de escritor.</p></div><Link to="/profile/new">Crear mi perfil →</Link></aside>}

      <section className="home__destinations" aria-labelledby="home-explore">
        <h2 id="home-explore">¿Por dónde quieres seguir?</h2>
        <Link className="home__destination" to="/communities"><span className="home__number" aria-hidden="true">01</span><div><h3>Explorar comunidades</h3><p>Descubre espacios de lectura e ideas. Busca una comunidad y conoce sus detalles.</p></div><span aria-hidden="true">↗</span></Link>
        <Link className="home__destination" to="/app/articles"><span className="home__number" aria-hidden="true">02</span><div><h3>Mis ensayos</h3><p>Retoma tus borradores, revisa lo publicado y organiza tus ensayos por estado.</p></div><span aria-hidden="true">↗</span></Link>
        <Link className="home__destination" to="/app/articles/new"><span className="home__number" aria-hidden="true">03</span><div><h3>Escribir un ensayo</h3><p>Dale forma a tu próxima idea y guárdala como borrador para continuar después.</p></div><span aria-hidden="true">↗</span></Link>
      </section>
      {!isAuthenticated && <p className="home__access"><Link to="/login">Inicia sesión</Link> para acceder a tus ensayos, o <Link to="/register">crea tu cuenta</Link> para empezar.</p>}
    </main>
  )
}
