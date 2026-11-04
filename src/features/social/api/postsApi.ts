import { httpClient } from '@/shared/api'
import type { Paginated, PaginationParams } from '@/shared/types/Paginated'
import { toPageQuery } from '@/shared/utils/pagination'
import type { Post, PostAuthor } from '../model/post.types'

export interface PostListParams extends PaginationParams {
  authorId?: number
  communityId?: number
}

// El backend ya filtra por visibilidad según quien consulta: el feed nunca trae posts restringidos ajenos.
export async function listPosts(params: PostListParams = {}, signal?: AbortSignal): Promise<Paginated<Post>> {
  const response = await httpClient.get<Paginated<Post>>('/posts', {
    params: {
      ...toPageQuery(params),
      ...(params.authorId ? { authorId: params.authorId } : {}),
      ...(params.communityId ? { communityId: params.communityId } : {}),
    },
    signal,
  })
  return response.data
}

export async function listMyPosts(params: PaginationParams = {}, signal?: AbortSignal): Promise<Paginated<Post>> {
  const response = await httpClient.get<Paginated<Post>>('/posts/mine', { params: toPageQuery(params), signal })
  return response.data
}

/** Responde 404 tanto si el post no existe como si el lector no tiene acceso a él. */
export async function getPost(id: number, signal?: AbortSignal): Promise<Post> {
  const response = await httpClient.get<Post>(`/posts/${id}`, { signal })
  return response.data
}

export async function listPostReplies(id: number, params: PaginationParams = {}, signal?: AbortSignal): Promise<Paginated<Post>> {
  const response = await httpClient.get<Paginated<Post>>(`/posts/${id}/replies`, { params: toPageQuery(params), signal })
  return response.data
}

export async function deletePost(id: number): Promise<void> {
  await httpClient.delete(`/posts/${id}`)
}

// GET /profiles es público y no está paginado: es la única fuente de autores para el filtro.
export async function listPostAuthors(signal?: AbortSignal): Promise<PostAuthor[]> {
  const response = await httpClient.get<PostAuthor[]>('/profiles', { signal })
  return response.data
}

export interface PostCommunityOption {
  id: number
  name: string
}

// GET /communities/mine devuelve membresías con la comunidad anidada, no comunidades.
export async function listPostCommunities(signal?: AbortSignal): Promise<PostCommunityOption[]> {
  const communities: PostCommunityOption[] = []
  for (let page = 1; ; page += 1) {
    const { data } = await httpClient.get<Paginated<{ community?: PostCommunityOption }>>('/communities/mine', {
      params: toPageQuery({ page, limit: 100 }),
      signal,
    })
    for (const { community } of data.data) {
      if (community) communities.push({ id: community.id, name: community.name })
    }
    if (data.data.length === 0 || page * data.limit >= data.total) return communities
  }
}
