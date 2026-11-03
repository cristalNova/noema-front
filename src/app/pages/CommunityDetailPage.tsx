import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listArticles } from '../../features/articles/api/articlesApi';
import type { Article } from '../../features/articles/model/article.types';
import { getCommunity } from '../../features/communities/api/communitiesApi';
import { CommunityPagination } from '../../features/communities/components/CommunityPagination';
import {
  getMyMembership,
  joinCommunity,
  leaveCommunity,
} from '../../features/communities/api/membersApi';
import type {
  CommunityDetail,
  MembershipStatus,
} from '../../features/communities/model/community.types';
import { listPlans, type Plan } from '../../features/monetization/api/plansApi';
import { createSubscription } from '../../features/monetization/api/subscriptionsApi';
import { getMyProfile } from '../../features/profiles/api/profilesApi';
import { listPosts } from '../../features/social/api/postsApi';
import type { Post } from '../../features/social/model/post.types';
import { getErrorMessage } from '../../shared/api/apiError';
import { tokenStorage } from '../../shared/api/tokenStorage';

type Tab = 'essays' | 'posts';
type MembershipView = MembershipStatus | 'OWNER' | 'NONE' | 'UNKNOWN';

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : 'Sin fecha';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es').format(value);

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

function Avatar({ name, photo }: { name: string; photo?: string }) {
  return photo ? (
    <img className="community-avatar" src={photo} alt="" />
  ) : (
    <span
      className="community-avatar community-avatar--fallback"
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

function CommunitySkeleton() {
  return (
    <div
      className="community-detail__skeleton"
      aria-label="Cargando comunidad"
      role="status"
    >
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return <p className="status-message community-empty">{children}</p>;
}

function PageError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="status-message status-message--error" role="alert">
      <p>{getErrorMessage(error)}</p>
      <button
        type="button"
        className="button button--secondary"
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}

export function CommunityDetailPage() {
  const { id } = useParams();
  const communityId = Number(id);
  const isInvalidId = !Number.isInteger(communityId) || communityId < 1;
  const isAuthenticated = Boolean(tokenStorage.get());
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState<unknown>(null);
  const [communityRetry, setCommunityRetry] = useState(0);
  const [tab, setTab] = useState<Tab>('essays');
  const [articles, setArticles] = useState<Article[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<unknown>(null);
  const [contentRetry, setContentRetry] = useState(0);
  const [contentPage, setContentPage] = useState(1);
  const [contentTotal, setContentTotal] = useState(0);
  const [contentLimit, setContentLimit] = useState(20);
  const [membership, setMembership] = useState<MembershipView>('UNKNOWN');
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipError, setMembershipError] = useState<unknown>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansRequested, setPlansRequested] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planError, setPlanError] = useState<unknown>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  useEffect(() => {
    if (isInvalidId) return undefined;
    let active = true;
    // The effect owns request lifecycle state after route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommunityLoading(true);
    setCommunityError(null);
    getCommunity(communityId)
      .then((response) => {
        if (active) setCommunity(response);
      })
      .catch((error: unknown) => {
        if (active) setCommunityError(error);
      })
      .finally(() => {
        if (active) setCommunityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [communityId, communityRetry, isInvalidId]);

  useEffect(() => {
    if (!community || !isAuthenticated) return undefined;
    let active = true;
    getMyProfile()
      .then((profile) => getMyMembership(community.id, profile.id))
      .then((currentMembership) => {
        if (active) {
          setMembership(
            currentMembership?.role === 'OWNER'
              ? 'OWNER'
              : currentMembership?.status ?? 'NONE',
          );
        }
      })
      .catch(() => {
        if (active) setMembership('NONE');
      });
    return () => {
      active = false;
    };
  }, [community, isAuthenticated]);

  useEffect(() => {
    if (!community) return undefined;
    let active = true;
    // The effect owns request lifecycle state after tab changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentLoading(true);
    setContentError(null);
    const request =
      tab === 'essays'
        ? listArticles({ communityId: community.id, page: contentPage })
        : listPosts({ communityId: community.id, page: contentPage });
    request
      .then((response) => {
        if (!active) return;
        if (tab === 'essays') setArticles(response.data as Article[]);
        else setPosts(response.data as Post[]);
        setContentTotal(response.total);
        setContentLimit(response.limit);
      })
      .catch((error: unknown) => {
        if (active) setContentError(error);
      })
      .finally(() => {
        if (active) setContentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [community, contentPage, contentRetry, tab]);

  const memberCount = community?.membersCount;
  const owner = community?.owner;
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan?.id === selectedPlanId),
    [plans, selectedPlanId],
  );

  const loadPlans = () => {
    if (!community || plans.length > 0 || plansLoading) return;
    setPlansRequested(true);
    setPlansLoading(true);
    setPlanError(null);
    listPlans({ communityId: community.id })
      .then((response) => {
        setPlans(
          response.data.filter(
            (plan) =>
              Boolean(plan) &&
              plan.communityId === community.id &&
              plan.isActive,
          ),
        );
      })
      .catch((error: unknown) => setPlanError(error))
      .finally(() => setPlansLoading(false));
  };

  const handleJoin = () => {
    if (!community || membershipBusy) return;
    setMembershipBusy(true);
    setMembershipError(null);
    joinCommunity(community.id)
      .then((result) => {
        setMembership(result.status);
        if (result.status === 'ACTIVE' && typeof memberCount === 'number') {
          setCommunity({ ...community, membersCount: memberCount + 1 });
        }
      })
      .catch((error: unknown) => setMembershipError(error))
      .finally(() => setMembershipBusy(false));
  };

  const handleLeave = () => {
    if (
      !community ||
      membershipBusy ||
      !window.confirm('¿Quieres salir de esta comunidad?')
    )
      return;
    setMembershipBusy(true);
    setMembershipError(null);
    leaveCommunity(community.id)
      .then(() => {
        setMembership('NONE');
        if (typeof memberCount === 'number')
          setCommunity({
            ...community,
            membersCount: Math.max(0, memberCount - 1),
          });
      })
      .catch((error: unknown) => setMembershipError(error))
      .finally(() => setMembershipBusy(false));
  };

  const handleSubscribe = () => {
    if (!selectedPlan) return;
    setSubscriptionBusy(true);
    setPlanError(null);
    createSubscription({
      planId: selectedPlan.id,
      autoRenew: true,
      paymentMethod: 'CARD',
    })
      .then(() =>
        setSubscriptionMessage(
          'Suscripción creada. Solicita acceso para completar tu incorporación.',
        ),
      )
      .catch((error: unknown) => setPlanError(error))
      .finally(() => setSubscriptionBusy(false));
  };

  if (isInvalidId) {
    return (
      <main className="page-shell">
        <p className="status-message status-message--error" role="alert">
          La comunidad solicitada no es válida.
        </p>
      </main>
    );
  }
  if (communityLoading)
    return (
      <main className="page-shell">
        <CommunitySkeleton />
      </main>
    );
  if (
    communityError &&
    (communityError as { status?: number }).status === 404
  ) {
    return (
      <main className="page-shell community-not-found">
        <p className="eyebrow">Noema · Comunidades</p>
        <h1>Comunidad no encontrada</h1>
        <p>Esta comunidad no existe o ya no está disponible.</p>
        <Link className="button button--primary" to="/communities">
          Volver a comunidades
        </Link>
      </main>
    );
  }
  if (communityError) {
    return (
      <main className="page-shell">
        <PageError
          error={communityError}
          onRetry={() => setCommunityRetry((value) => value + 1)}
        />
      </main>
    );
  }
  if (!community) return null;

  const membershipLabel =
    membership === 'OWNER'
      ? 'Propietario'
      : membership === 'ACTIVE'
      ? 'Salir'
      : membership === 'PENDING'
        ? 'Solicitud pendiente de aprobación'
        : community.isPremium
          ? 'Suscribirme'
          : 'Unirme';

  return (
    <main className="page-shell community-detail-page">
      <Link className="back-link" to="/communities">
        ← Volver a comunidades
      </Link>
      <article className="community-detail">
        <header className="community-hero">
          <div className="community-hero__copy">
            <div className="community-card__topline">
              <span className="community-card__topic">{community.topic}</span>
              {community.isPremium && (
                <span className="premium-badge">Premium</span>
              )}
            </div>
            <h1>{community.name}</h1>
            <p className="community-hero__description">
              {community.description ||
                'Una comunidad para compartir ideas y lecturas.'}
            </p>
            {community.tags.length > 0 && (
              <ul className="tag-list" aria-label="Etiquetas">
                {community.tags.map((item) => (
                  <li key={`${item.communityId}-${item.tag}`}>{item.tag}</li>
                ))}
              </ul>
            )}
          </div>
          <aside className="community-hero__aside">
            <Link
              className="community-owner"
              to={`/profiles/${owner?.id ?? community.ownerId}`}
            >
              <Avatar
                name={owner?.name ?? 'Propietario'}
                photo={owner?.profilePhoto}
              />
              <span>
                <small>Propietario</small>
                <strong>{owner?.name ?? 'Perfil no disponible'}</strong>
              </span>
            </Link>
            <div className="community-member-count">
              <strong>
                {typeof memberCount === 'number'
                  ? formatNumber(memberCount)
                  : '—'}
              </strong>
              <span>
                {typeof memberCount === 'number'
                  ? 'miembros'
                  : 'Miembros no disponibles'}
              </span>
            </div>
            {isAuthenticated && membership !== 'UNKNOWN' ? (
              <div className="membership-action">
                <button
                  type="button"
                  className={`button ${membership === 'ACTIVE' ? 'button--secondary' : 'button--primary'}`}
                  disabled={
                    membershipBusy ||
                    membership === 'PENDING' ||
                    membership === 'OWNER'
                  }
                  onClick={
                    membership === 'ACTIVE'
                      ? handleLeave
                      : community.isPremium
                        ? loadPlans
                        : handleJoin
                  }
                >
                  {membershipBusy ? 'Procesando…' : membershipLabel}
                </button>
                {membershipError !== null && (
                  <p className="form-error" role="alert">
                    {getErrorMessage(membershipError)}
                  </p>
                )}
              </div>
            ) : !isAuthenticated ? (
              <Link className="button button--primary" to="/login">
                Inicia sesión para unirte
              </Link>
            ) : (
              <span className="status-message">Comprobando membresía…</span>
            )}
          </aside>
        </header>

        {community.isPremium &&
          membership === 'NONE' &&
          plansRequested &&
          plans.length > 0 && (
            <section className="plan-panel" aria-label="Planes de suscripción">
              <div>
                <p className="eyebrow">Acceso premium</p>
                <h2>Elige un plan</h2>
                <p>La suscripción no sustituye la aprobación de membresía.</p>
              </div>
              <label>
                Plan
                <select
                  value={selectedPlanId ?? ''}
                  onChange={(event) =>
                    setSelectedPlanId(Number(event.target.value) || null)
                  }
                >
                  <option value="">Selecciona un plan</option>
                  {plans.map((plan) =>
                    plan ? (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {plan.price} {plan.currency} /{' '}
                        {plan.billingPeriod === 'MONTHLY' ? 'mes' : 'año'}
                      </option>
                    ) : null,
                  )}
                </select>
              </label>
              <button
                type="button"
                className="button button--primary"
                disabled={!selectedPlan || subscriptionBusy}
                onClick={handleSubscribe}
              >
                {subscriptionBusy ? 'Procesando…' : 'Confirmar suscripción'}
              </button>
              {subscriptionMessage && (
                <p className="form-success" role="status">
                  {subscriptionMessage}
                </p>
              )}
              {subscriptionMessage && (
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={membershipBusy}
                  onClick={handleJoin}
                >
                  {membershipBusy ? 'Procesando…' : 'Solicitar acceso'}
                </button>
              )}
            </section>
          )}
        {community.isPremium && membership === 'NONE' && plansLoading && (
          <p className="status-message" role="status">
            Cargando planes…
          </p>
        )}
        {community.isPremium &&
          membership === 'NONE' &&
          plansRequested &&
          !plansLoading &&
          !planError &&
          plans.length === 0 && (
            <div className="status-message">
              <p>
                No hay planes activos para esta comunidad. Puedes solicitar
                acceso directamente.
              </p>
              <button
                type="button"
                className="button button--primary"
                disabled={membershipBusy}
                onClick={handleJoin}
              >
                {membershipBusy ? 'Procesando…' : 'Solicitar acceso'}
              </button>
            </div>
          )}
        {community.isPremium && membership === 'NONE' && planError !== null && (
          <PageError error={planError} onRetry={loadPlans} />
        )}

        <nav
          className="community-tabs"
          aria-label="Contenido de la comunidad"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'essays'}
            aria-controls="community-essays-panel"
            id="community-essays-tab"
            className={tab === 'essays' ? 'is-active' : ''}
            onClick={() => {
              setTab('essays');
              setContentPage(1);
            }}
          >
            Ensayos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'posts'}
            aria-controls="community-posts-panel"
            id="community-posts-tab"
            className={tab === 'posts' ? 'is-active' : ''}
            onClick={() => {
              setTab('posts');
              setContentPage(1);
            }}
          >
            Publicaciones
          </button>
        </nav>
        <section
          className="community-content"
          role="tabpanel"
          id={tab === 'essays' ? 'community-essays-panel' : 'community-posts-panel'}
          aria-labelledby={tab === 'essays' ? 'community-essays-tab' : 'community-posts-tab'}
        >
          {contentLoading && (
            <p className="status-message" role="status">
              Cargando {tab === 'essays' ? 'ensayos' : 'publicaciones'}…
            </p>
          )}
          {contentError !== null && (
            <PageError
              error={contentError}
              onRetry={() => setContentRetry((value) => value + 1)}
            />
          )}
          {!contentLoading &&
            !contentError &&
            tab === 'essays' &&
            articles.length === 0 && (
              <EmptyState>
                No hay ensayos publicados en esta comunidad.
              </EmptyState>
            )}
          {!contentLoading &&
            !contentError &&
            tab === 'posts' &&
            posts.length === 0 && (
              <EmptyState>No hay publicaciones en esta comunidad.</EmptyState>
            )}
          {!contentLoading &&
            !contentError &&
            tab === 'essays' &&
            articles.map((article) => (
              <article className="content-card" key={article.id}>
                <div className="content-card__meta">
                  {article.author?.name && <span>{article.author.name}</span>}
                  <time dateTime={article.publishedAt ?? undefined}>
                    {formatDate(article.publishedAt)}
                  </time>
                  {article.isPremium && (
                    <span className="premium-badge">Premium</span>
                  )}
                </div>
                <h2><Link to={`/articles/${article.id}`}>{article.title}</Link></h2>
                {article.description && <p>{article.description}</p>}
                {article.articleTags?.length > 0 && (
                  <ul className="tag-list">
                    {article.articleTags.map((tag) => (
                      <li key={`${article.id}-${tag.tag}`}>{tag.tag}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          {!contentLoading &&
            !contentError &&
            tab === 'posts' &&
            posts.map((post) => (
              <article className="content-card" key={post.id}>
                <div className="content-card__meta">
                  <span className="content-card__author">
                    <Avatar
                      name={post.owner.name}
                      photo={post.owner.profilePhoto}
                    />
                    {post.owner.name}
                  </span>
                  <time dateTime={post.createdAt}>
                    {formatDate(post.createdAt)}
                  </time>
                </div>
                <p className="post-content">
                  {post.content || 'Publicación sin contenido.'}
                </p>
                <div className="post-stats" aria-label="Interacciones">
                  <span>♡ {formatNumber(post.likes)}</span>
                  <span>◌ {formatNumber(post.commentCount)}</span>
                  <span>↻ {formatNumber(post.repostCount)}</span>
                </div>
              </article>
            ))}
          {!contentLoading && !contentError && contentTotal > contentLimit && (
            <CommunityPagination
              page={contentPage}
              total={contentTotal}
              limit={contentLimit}
              onPageChange={setContentPage}
            />
          )}
        </section>
      </article>
    </main>
  );
}
