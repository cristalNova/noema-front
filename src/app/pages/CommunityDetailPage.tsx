import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useRequireAuth } from '../../features/auth';
import { useMyProfile } from '../../features/profiles';
import { listArticles } from '../../features/articles/api/articlesApi';
import type { Article } from '../../features/articles/model/article.types';
import { getCommunity } from '../../features/communities/api/communitiesApi';
import { LeaveCommunityDialog } from '../../features/communities/components/LeaveCommunityDialog';
import { useLeaveCommunity } from '../../features/communities/hooks/useLeaveCommunity';
import { Pagination } from '../../shared/components/Pagination';
import { ArticleByline } from '../../features/articles/components/ArticleByline';
import { useArticleAttribution } from '../../features/articles/hooks/useArticleAttribution';
import { PostCard } from '../../features/social/components/PostCard';
import {
  getMyMembership,
  kickCommunityMember,
  joinCommunity,
  listCommunityMembers,
  updateCommunityMember,
} from '../../features/communities/api/membersApi';
import {
  MembershipActionDialog,
  type MembershipAction,
} from '../../features/communities/components/MembershipActionDialog';
import type {
  CommunityDetail,
  Membership,
  MembershipStatus,
} from '../../features/communities/model/community.types';
import { getMyProfile } from '../../features/profiles/api/profilesApi';
import { listPosts } from '../../features/social/api/postsApi';
import type { Post } from '../../features/social/model/post.types';
import { getErrorMessage, toApiError } from '../../shared/api/apiError';
import { tokenStorage } from '../../shared/api/tokenStorage';

type Tab = 'essays' | 'posts' | 'members';
type MembershipView = MembershipStatus | 'OWNER' | 'NONE' | 'UNKNOWN';
type MemberStatusFilter = Extract<MembershipStatus, 'ACTIVE' | 'PENDING' | 'BANNED'>;

const ROLE_LABELS: Record<Membership['role'], string> = {
  MEMBER: 'Miembro',
  MODERATOR: 'Moderador',
  OWNER: 'Propietario',
};

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
  const [imageFailed, setImageFailed] = useState(false);
  return photo && !imageFailed ? (
    <img
      className="community-avatar"
      src={photo}
      alt=""
      onError={() => setImageFailed(true)}
    />
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

function CommunityDetail() {
  const { id } = useParams();
  const location = useLocation();
  const communityId = Number(id);
  const isInvalidId = !Number.isInteger(communityId) || communityId < 1;
  const isAuthenticated = Boolean(tokenStorage.get());
  const requireAuth = useRequireAuth();
  const { profile: myProfile } = useMyProfile();
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState<unknown>(null);
  const [communityRetry, setCommunityRetry] = useState(0);
  const [tab, setTab] = useState<Tab>('essays');
  const [articles, setArticles] = useState<Article[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<unknown>(null);
  const [contentRetry, setContentRetry] = useState(0);
  const [contentPage, setContentPage] = useState(1);
  const [contentTotal, setContentTotal] = useState(0);
  const [contentLimit, setContentLimit] = useState(20);
  const [membership, setMembership] = useState<MembershipView>('UNKNOWN');
  const [membershipRole, setMembershipRole] = useState<Membership['role'] | null>(null);
  const [memberStatus, setMemberStatus] = useState<MemberStatusFilter>('ACTIVE');
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipError, setMembershipError] = useState<unknown>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const leaveRequest = useLeaveCommunity();
  const [memberAction, setMemberAction] = useState<{
    action: MembershipAction;
    member: Membership;
  } | null>(null);
  const [memberActionPending, setMemberActionPending] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | undefined>();
  const [memberActionSuccess, setMemberActionSuccess] = useState<string | null>(null);
  // GET /articles no incluye al autor: se resuelve por id (la comunidad ya es el contexto, no se repite).
  const { authorOf } = useArticleAttribution(articles);
  const communityUpdated = new URLSearchParams(location.search).get('updated') === '1';

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
          setMembershipRole(currentMembership?.role ?? null);
          setMembership(
            currentMembership?.role === 'OWNER'
              ? 'OWNER'
              : currentMembership?.status ?? 'NONE',
          );
        }
      })
      .catch(() => {
          if (active) {
            setMembershipRole(null);
            setMembership('NONE');
          }
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
        : tab === 'posts'
          ? listPosts({ communityId: community.id, page: contentPage })
          : listCommunityMembers(community.id, {
              page: contentPage,
              status: memberStatus,
            });
    request
      .then((response) => {
        if (!active) return;
        if (tab === 'essays') setArticles(response.data as Article[]);
        else if (tab === 'posts') setPosts(response.data as Post[]);
        else setMembers(response.data as Membership[]);
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
  }, [community, contentPage, contentRetry, memberStatus, tab]);

  const memberCount = community?.memberCount;
  const owner = community?.owner;
  const canModerateMembers =
    membershipRole === 'OWNER' || membershipRole === 'MODERATOR';
  const canManageMember = (member: Membership) =>
    canModerateMembers &&
    member.role !== 'OWNER' &&
    member.profileId !== myProfile?.id &&
    (membershipRole === 'OWNER' || member.role === 'MEMBER');

  const openMemberAction = (action: MembershipAction, member: Membership) => {
    setMemberActionError(undefined);
    setMemberAction({ action, member });
  };

  const closeMemberAction = () => {
    if (!memberActionPending) {
      setMemberAction(null);
      setMemberActionError(undefined);
    }
  };

  const confirmMemberAction = async (): Promise<boolean> => {
    if (!community || !memberAction || memberActionPending) return false;
    setMemberActionPending(true);
    setMemberActionError(undefined);
    try {
      const { action, member } = memberAction;
      if (action === 'reject' || action === 'kick') {
        await kickCommunityMember(community.id, member.profileId);
      } else {
        const update =
          action === 'approve'
            ? { status: 'ACTIVE' as const }
            : action === 'promote'
              ? { role: 'MODERATOR' as const }
              : action === 'demote'
                ? { role: 'MEMBER' as const }
                  : action === 'ban'
                    ? { status: 'BANNED' as const }
                    : { status: 'ACTIVE' as const };
        const updated = await updateCommunityMember(
          community.id,
          member.profileId,
          update,
        );
        if (action === 'promote' || action === 'demote') {
          setMembers((current) =>
            current.map((item) =>
              item.profileId === member.profileId
                ? { ...item, ...updated, profile: updated.profile ?? item.profile }
                : item,
            ),
          );
        }
      }

      if (action === 'approve') {
        setMemberStatus('ACTIVE');
        setContentPage(1);
        setCommunity((current) =>
          current
            ? { ...current, memberCount: (current.memberCount ?? 0) + 1 }
            : current,
        );
      } else if (action === 'reject') {
        setContentRetry((value) => value + 1);
      } else if (action === 'kick') {
        const nextTotal = Math.max(0, contentTotal - 1);
        setMembers((current) =>
          current.filter((item) => item.profileId !== member.profileId),
        );
        setContentTotal(nextTotal);
        setCommunity((current) =>
          current && typeof current.memberCount === 'number'
            ? { ...current, memberCount: Math.max(0, current.memberCount - 1) }
            : current,
        );
        if (contentPage > 1 && (contentPage - 1) * contentLimit >= nextTotal) {
          setContentPage(contentPage - 1);
        }
      } else if (action === 'ban' && memberStatus === 'ACTIVE') {
        setCommunity((current) =>
          current && current.memberCount
            ? { ...current, memberCount: current.memberCount - 1 }
            : current,
        );
        setContentRetry((value) => value + 1);
      } else if (action === 'unban' && memberStatus === 'BANNED') {
        setMemberStatus('ACTIVE');
        setContentPage(1);
        setCommunity((current) =>
          current
            ? { ...current, memberCount: (current.memberCount ?? 0) + 1 }
            : current,
        );
      }

      const successMessages: Record<MembershipAction, string> = {
        approve: `${member.profile.name} ahora es miembro activo.`,
        reject: `La solicitud de ${member.profile.name} fue rechazada.`,
        promote: `${member.profile.name} ahora es moderador.`,
        demote: `Se quitó el rol de moderador a ${member.profile.name}.`,
        ban: `${member.profile.name} ha sido vetado.`,
        unban: `Se quitó el veto a ${member.profile.name}.`,
        kick: `${member.profile.name} ha sido expulsado de la comunidad.`,
      };
      setMemberActionSuccess(successMessages[action]);
      setMemberAction(null);
      return true;
    } catch (error: unknown) {
      setMemberActionError(getErrorMessage(error));
      return false;
    } finally {
      setMemberActionPending(false);
    }
  };
  const handleJoin = () => {
    if (!community || membershipBusy) return;
    setMembershipBusy(true);
    setMembershipError(null);
    joinCommunity(community.id)
      .then((result) => {
        setMembership(result.status);
        if (result.status === 'ACTIVE' && typeof memberCount === 'number') {
          setCommunity({ ...community, memberCount: memberCount + 1 });
        }
      })
      .catch((error: unknown) => {
        // Un miembro común no puede consultar su solicitud pendiente ni su veto (solo moderación los lista):
        // si el backend responde que ya existe, esa respuesta dice en qué estado está.
        const { status, message } = toApiError(error);
        if (status === 409) {
          setMembership(/pendiente/i.test(message) ? 'PENDING' : 'ACTIVE');
        } else if (status === 403 && /vetado/i.test(message)) {
          setMembership('BANNED');
        } else {
          setMembershipError(error);
        }
      })
      .finally(() => setMembershipBusy(false));
  };

  // Salir pide confirmación en un diálogo; el motivo de un rechazo del servidor se muestra dentro de él.
  const handleLeave = () => {
    if (!community || membershipBusy) return;
    setMembershipError(null);
    setConfirmingLeave(true);
  };

  const confirmLeave = async (target: CommunityDetail): Promise<string | null> => {
    setMembershipBusy(true);
    const reason = await leaveRequest(target.id);
    setMembershipBusy(false);
    if (reason) return reason;
    setMembership('NONE');
    if (typeof memberCount === 'number')
      setCommunity({ ...target, memberCount: Math.max(0, memberCount - 1) });
    return null;
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

  // Solo el propietario ve la edición; el backend lo exige también (403 para cualquier otro).
  const isOwner = myProfile !== null && myProfile.id === community.ownerId;
  // El propietario no se une, no sale ni se suscribe a su propia comunidad, aunque falte su fila de membresía.
  const currentMembership: MembershipView = isOwner ? 'OWNER' : membership;
  const membershipLabel =
    currentMembership === 'OWNER'
      ? 'Propietario'
      : currentMembership === 'ACTIVE'
      ? 'Salir'
      : currentMembership === 'PENDING'
        ? 'Solicitud pendiente de aprobación'
        : currentMembership === 'BANNED'
          ? 'Vetado de esta comunidad'
          : 'Unirme';
  const plansPath = `/communities/${community.id}/plans`;
  // Al suscribirse se concede la membresía: en una comunidad premium ese es el camino para entrar.
  const canSubscribe =
    community.isPremium && isAuthenticated && currentMembership === 'NONE';

  return (
    <main className="page-shell community-detail-page">
      <Link className="back-link" to="/communities">
        ← Volver a comunidades
      </Link>
      {communityUpdated && (
        <p className="status-message" role="status">
          Cambios guardados correctamente.
        </p>
      )}
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
            {isOwner && (
              <Link
                className="button button--secondary community-hero__plans"
                to={`/communities/${community.id}/edit`}
              >
                Editar comunidad
              </Link>
            )}
            {community.isPremium && !canSubscribe && (
              <Link
                className="button button--secondary community-hero__plans"
                to={plansPath}
              >
                Ver planes
              </Link>
            )}
            {canSubscribe ? (
              <Link
                className="button button--primary community-hero__plans"
                to={plansPath}
              >
                Suscribirme
              </Link>
            ) : isAuthenticated && currentMembership !== 'UNKNOWN' ? (
              <div className="membership-action">
                <button
                  type="button"
                  className={`button ${currentMembership === 'ACTIVE' ? 'button--secondary' : 'button--primary'}`}
                  disabled={
                    membershipBusy ||
                    currentMembership === 'PENDING' ||
                    currentMembership === 'BANNED' ||
                    currentMembership === 'OWNER'
                  }
                  onClick={currentMembership === 'ACTIVE' ? handleLeave : handleJoin}
                >
                  {membershipBusy ? 'Procesando…' : membershipLabel}
                </button>
                {confirmingLeave && (
                  <LeaveCommunityDialog
                    communityName={community.name}
                    onClose={() => setConfirmingLeave(false)}
                    onConfirm={() => confirmLeave(community)}
                  />
                )}
                {membershipError !== null && (
                  <p className="form-error" role="alert">
                    {getErrorMessage(membershipError)}
                  </p>
                )}
              </div>
            ) : !isAuthenticated ? (
              <button
                type="button"
                className="button button--primary"
                onClick={() => requireAuth('unirte a esta comunidad')}
              >
                Inicia sesión para unirte
              </button>
            ) : (
              <span className="status-message">Comprobando membresía…</span>
            )}
          </aside>
        </header>

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
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'members'}
            aria-controls="community-members-panel"
            id="community-members-tab"
            className={tab === 'members' ? 'is-active' : ''}
            onClick={() => {
              setTab('members');
              setContentPage(1);
            }}
          >
            Miembros
            {typeof memberCount === 'number' && ` (${formatNumber(memberCount)})`}
          </button>
        </nav>
        <section
          className="community-content"
          role="tabpanel"
          id={`community-${tab}-panel`}
          aria-labelledby={`community-${tab}-tab`}
        >
          {contentLoading && (
            <p className="status-message" role="status">
              Cargando{' '}
              {tab === 'essays'
                ? 'ensayos'
                : tab === 'posts'
                  ? 'publicaciones'
                  : 'miembros'}
              …
            </p>
          )}
          {contentError !== null && (
            <PageError
              error={contentError}
              onRetry={() => setContentRetry((value) => value + 1)}
            />
          )}
          {memberActionSuccess && tab === 'members' && (
            <p className="form-success" role="status" aria-live="polite">
              {memberActionSuccess}
            </p>
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
            tab === 'members' &&
            members.length === 0 && (
              <EmptyState>
                {memberStatus === 'ACTIVE'
                  ? 'Todavía no hay miembros activos en esta comunidad.'
                  : memberStatus === 'PENDING'
                    ? 'No hay solicitudes pendientes.'
                    : 'No hay miembros vetados.'}
              </EmptyState>
            )}
          {!contentLoading && !contentError && tab === 'members' && (
            <div className="member-management">
              <h2 className="member-management__heading">
                {memberStatus === 'PENDING' ? 'Solicitudes pendientes' : 'Miembros'}
                {memberStatus === 'PENDING' && ` (${contentTotal})`}
              </h2>
              <div className="member-filters" aria-label="Filtrar miembros">
                <button
                  type="button"
                  className={memberStatus === 'ACTIVE' ? 'is-active' : ''}
                  aria-pressed={memberStatus === 'ACTIVE'}
                  onClick={() => {
                    setMemberStatus('ACTIVE');
                    setContentPage(1);
                    setMemberActionSuccess(null);
                  }}
                >
                  Activos
                </button>
                {canModerateMembers && (
                  <>
                    <button
                      type="button"
                      className={memberStatus === 'PENDING' ? 'is-active' : ''}
                      aria-pressed={memberStatus === 'PENDING'}
                      onClick={() => {
                        setMemberStatus('PENDING');
                        setContentPage(1);
                        setMemberActionSuccess(null);
                      }}
                    >
                      Pendientes
                    </button>
                    <button
                      type="button"
                      className={memberStatus === 'BANNED' ? 'is-active' : ''}
                      aria-pressed={memberStatus === 'BANNED'}
                      onClick={() => {
                        setMemberStatus('BANNED');
                        setContentPage(1);
                        setMemberActionSuccess(null);
                      }}
                    >
                      Vetados
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {!contentLoading &&
            !contentError &&
            tab === 'members' &&
            members.length > 0 && (
              <ul className="member-list" aria-label="Miembros de la comunidad">
                {members.map((member) => (
                  <li className="member-card" key={member.profileId}>
                    <Avatar
                      name={member.profile.name}
                      photo={member.profile.profilePhoto}
                    />
                    <Link
                      className="member-card__info"
                      to={`/profiles/${member.profileId}`}
                      aria-label={`Ver perfil de ${member.profile.name}`}
                    >
                      <strong>{member.profile.name}</strong>
                      <small>@{member.profile.username}</small>
                    </Link>
                    <span
                      className={`member-card__role member-card__role--${member.role.toLowerCase()}`}
                    >
                      {ROLE_LABELS[member.role]}
                    </span>
                    <time
                      className="member-card__since"
                      dateTime={member.joinedAt}
                    >
                      Desde {formatDate(member.joinedAt)}
                    </time>
                    {canManageMember(member) && (
                      <div className="member-card__actions" aria-label={`Acciones para ${member.profile.name}`}>
                        {memberStatus === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              className="button button--primary"
                              disabled={memberActionPending}
                              onClick={() => openMemberAction('approve', member)}
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              className="button button--danger"
                              disabled={memberActionPending}
                              onClick={() => openMemberAction('reject', member)}
                            >
                              Rechazar
                            </button>
                          </>
                        ) : memberStatus === 'ACTIVE' ? (
                          <>
                            {member.role === 'MEMBER' && (
                              <button
                                type="button"
                                className="button button--secondary"
                                disabled={memberActionPending}
                                onClick={() => openMemberAction('promote', member)}
                              >
                                Promover a moderador
                              </button>
                            )}
                            {member.role === 'MODERATOR' && membershipRole === 'OWNER' && (
                              <button
                                type="button"
                                className="button button--secondary"
                                disabled={memberActionPending}
                                onClick={() => openMemberAction('demote', member)}
                              >
                                Quitar rol de moderador
                              </button>
                            )}
                            <button
                              type="button"
                              className="button button--danger"
                              disabled={memberActionPending}
                              onClick={() => openMemberAction('ban', member)}
                            >
                              Vetar
                            </button>
                            <button
                              type="button"
                              className="button button--danger"
                              disabled={memberActionPending}
                              onClick={() => openMemberAction('kick', member)}
                            >
                              Expulsar
                            </button>
                          </>
                        ) : memberStatus === 'BANNED' ? (
                          <button
                            type="button"
                            className="button button--primary"
                            disabled={memberActionPending}
                            onClick={() => openMemberAction('unban', member)}
                          >
                            Quitar veto
                          </button>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          {!contentLoading &&
            !contentError &&
            tab === 'essays' &&
            articles.map((article) => (
              <article className="content-card" key={article.id}>
                <div className="content-card__meta">
                  <time dateTime={article.publishedAt ?? undefined}>
                    {formatDate(article.publishedAt)}
                  </time>
                  {article.isPremium && (
                    <span className="premium-badge">Premium</span>
                  )}
                </div>
                <h2><Link to={`/articles/${article.id}`}>{article.title}</Link></h2>
                <ArticleByline author={authorOf(article)} community={null} />
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
              <PostCard key={post.id} post={post} showCommunity={false} />
            ))}
          {!contentLoading &&
            !contentError &&
            contentTotal > contentLimit && (
            <Pagination
              page={contentPage}
              total={contentTotal}
              limit={contentLimit}
              label={
                tab === 'members'
                  ? `Paginación de miembros ${memberStatus.toLowerCase()}`
                  : 'Paginación del contenido de la comunidad'
              }
              onPageChange={setContentPage}
            />
          )}
        </section>
        {memberAction && (
          <MembershipActionDialog
            action={memberAction.action}
            memberName={memberAction.member.profile.name}
            pending={memberActionPending}
            error={memberActionError}
            onClose={closeMemberAction}
            onConfirm={confirmMemberAction}
          />
        )}
      </article>
    </main>
  );
}

/** Se remonta al cambiar de comunidad para no arrastrar pestaña, página ni membresía de la anterior. */
export function CommunityDetailPage() {
  const { id } = useParams();
  return <CommunityDetail key={id} />;
}
