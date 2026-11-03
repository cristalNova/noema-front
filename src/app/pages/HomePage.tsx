import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { usePublishedArticles } from '@/features/articles/hooks/usePublishedArticles'
import { EssayCover } from '@/features/articles/components/EssayCover'
import { HomeShelf } from './HomeBooks'
import './HomePage.css'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { status, profile } = useMyProfile()
  const readings = usePublishedArticles()
  return (
    <main className="home">
      <div className="home__hero"><header className="home__intro">
        <p className="home__eyebrow">{profile ? `El espacio de ${profile.name}` : 'Un espacio para tus ideas'}</p>
        <h1>Lee, escribe y comparte ideas</h1>
        <p className="home__description">Encuentra una comunidad, retoma un ensayo o empieza con esa idea que tienes en mente.</p>
        <div className="home__intro-actions"><Link className="home__primary" to="/articles">Encuentra tu próxima lectura <span aria-hidden="true">↗</span></Link>
        <Link className="home__read" to="/app/articles/new">Empezar a escribir →</Link></div>
      </header>
      <section className="home__library" aria-labelledby="home-readings">
        <div className="home__library-heading"><h2 id="home-readings">Recién publicados</h2><Link to="/articles" aria-label="Ver todos los ensayos publicados">Ver todos ↗</Link></div>
        {readings.isLoading ? <p className="home__library-message" role="status">Preparando tus próximas lecturas…</p> : readings.error ? <div className="home__library-message" role="alert"><p>{readings.error}</p><button type="button" className="button button--secondary" onClick={readings.retry}>Reintentar</button></div> : readings.articles.length ? <>
          <div className="home__shelf">{readings.articles.slice(0, 4).map((article) => <Link key={article.id} to={`/articles/${article.id}`} aria-label={`Leer “${article.title}”`}><EssayCover article={article} /></Link>)}</div>
          <p className="home__library-count"><span>{readings.total}</span> {readings.total === 1 ? 'ensayo para descubrir' : 'ensayos para descubrir'}</p>
        </> : <div className="home__library-message"><p>Las buenas ideas empiezan con una página en blanco.</p><Link to="/app/articles/new">Escribe el primer ensayo ↗</Link></div>}
      </section></div>
      <HomeShelf />

      {isAuthenticated && status === 'missing' && <aside className="home__profile"><div><strong>Tu espacio está casi listo.</strong><p>Crea tu perfil para guardar ensayos y participar con tu identidad de escritor.</p></div><Link to="/profile/new">Crear mi perfil →</Link></aside>}

      <section className="home__destinations" aria-labelledby="home-explore">
        <h2 id="home-explore">Un lugar para cada idea.</h2><p className="home__section-description">Tu lectura y tu escritura, a tu manera.</p><div className="home__destination-grid">
        <Link className="home__destination" to="/communities"><span className="home__number" aria-hidden="true">01</span><div><h3>Explorar comunidades</h3><p>Descubre espacios de lectura e ideas. Busca una comunidad y conoce sus detalles.</p></div><span aria-hidden="true">↗</span></Link>
        <Link className="home__destination" to="/app/articles"><span className="home__number" aria-hidden="true">02</span><div><h3>Mis ensayos</h3><p>Retoma tus borradores, revisa lo publicado y organiza tus ensayos por estado.</p></div><span aria-hidden="true">↗</span></Link>
        <Link className="home__destination" to="/app/articles/new"><span className="home__number" aria-hidden="true">03</span><div><h3>Escribir un ensayo</h3><p>Dale forma a tu próxima idea y guárdala como borrador para continuar después.</p></div><span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      {!isAuthenticated && <p className="home__access"><Link to="/login">Inicia sesión</Link> para acceder a tus ensayos, o <Link to="/register">crea tu cuenta</Link> para empezar.</p>}
    </main>
  )
}
