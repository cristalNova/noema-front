import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { usePublishedArticles } from '@/features/articles/hooks/usePublishedArticles'
import { useInterestArticles } from '@/features/articles/hooks/useInterestArticles'
import { EssayCover } from '@/features/articles/components/EssayCover'
import { HomeShelf } from './HomeBooks'
import './HomePage.css'

const DESTINATIONS = [
  { to: '/communities', title: 'Explorar comunidades', description: 'Descubre espacios de lectura e ideas. Busca una comunidad y conoce sus detalles.' },
  { to: '/app/articles', title: 'Mis ensayos', description: 'Retoma tus borradores, revisa lo publicado y organiza tus ensayos por estado.' },
  { to: '/app/articles/new', title: 'Escribir un ensayo', description: 'Dale forma a tu próxima idea y guárdala como borrador para continuar después.' },
  { to: '/app/collections', title: 'Mis colecciones', description: 'Reúne tus ensayos por tema o serie, edítalas cuando quieras y mantenlas en orden.' },
  { to: '/tags', title: 'Explorar por temas', description: 'Encuentra ideas que te interesan y descubre los ensayos de cada tema.' },
  { to: '/posts', title: 'Publicaciones', description: 'Sigue la conversación: lo que se comenta ahora entre quienes leen y escriben en Noema.' },
  { to: '/app/plans', title: 'Mis planes', description: 'Crea planes para que tus lectores apoyen tu trabajo y accedan a tu contenido.' },
  { to: '/app/notifications', title: 'Notificaciones', description: 'Nuevos seguidores, comentarios, reacciones y movimiento en tus comunidades.' },
]

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { status, profile } = useMyProfile()
  const readings = usePublishedArticles()
  const interests = useInterestArticles(isAuthenticated && status === 'ready')
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
      {isAuthenticated && status === 'ready' && <section className="home__interests" aria-labelledby="home-interests">
        <div className="home__library-heading"><h2 id="home-interests">Para tus intereses</h2><Link to="/onboarding/interests">Editar intereses ↗</Link></div>
        {interests.loading ? <p role="status">Buscando lecturas para ti…</p> : interests.error ? <div role="alert"><p>{interests.error}</p><button type="button" className="button button--secondary" onClick={interests.retry}>Reintentar</button></div> : interests.tags.length === 0 ? <p>Elige tus intereses para descubrir lecturas relacionadas. <Link to="/onboarding/interests">Elegir intereses</Link></p> : interests.articles.length === 0 ? <p>Todavía no hay ensayos publicados sobre tus intereses. <Link to="/articles">Explorar todos</Link></p> : <div className="home__interest-grid">{interests.articles.map((article) => <Link key={article.id} to={`/articles/${article.id}`} className="home__interest-card"><EssayCover article={article} /><strong>{article.title}</strong><span>{article.articleTags?.map(({ tag }) => `#${tag}`).join(' · ')}</span></Link>)}</div>}
      </section>}
      <HomeShelf />

      {isAuthenticated && status === 'missing' && <aside className="home__profile"><div><strong>Tu espacio está casi listo.</strong><p>Crea tu perfil para guardar ensayos y participar con tu identidad de escritor.</p></div><Link to="/profile/new">Crear mi perfil →</Link></aside>}

      <section className="home__destinations" aria-labelledby="home-explore">
        <h2 id="home-explore">Un lugar para cada idea.</h2><p className="home__section-description">Tu lectura y tu escritura, a tu manera.</p><div className="home__destination-grid">
        {DESTINATIONS.map((destination, index) => (
          <Link key={destination.to} className="home__destination" to={destination.to}><span className="home__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{destination.title}</h3><p>{destination.description}</p></div><span aria-hidden="true">↗</span></Link>
        ))}
        </div>
      </section>
      {!isAuthenticated && <p className="home__access"><Link to="/login">Inicia sesión</Link> para acceder a tus ensayos, o <Link to="/register">crea tu cuenta</Link> para empezar.</p>}
    </main>
  )
}
