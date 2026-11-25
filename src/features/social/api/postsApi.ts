import { httpClient } from '@/shared/api'
import type { Paginated, PaginationParams } from '@/shared/types/Paginated'
import { toPageQuery } from '@/shared/utils/pagination'
import type { Post } from '../model/post.types'

export interface PostListParams extends PaginationParams {
  authorId?: number
  communityId?: number
}

export interface CreatePostInput {
  postType: 'ORIGINAL'
  content: string
  articleId?: number
  communityId?: number
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'COMMUNITY'
}

/**
 * Responder, republicar o citar un post. El backend decide la visibilidad: una respuesta a un post de comunidad
 * se queda en ella y una cita o republicación es pública. Un repost no lleva contenido; la respuesta y la cita sí.
 */
export interface CreateRelatedPostInput {
  postType: 'REPLY' | 'REPOST' | 'QUOTE'
  parentPostId: number
  content?: string
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const response = await httpClient.post<Post>('/posts', input)
  return response.data
}

/** 403 si el post no es público (repost y cita), 409 si ya lo republicaste, 400 si es un repost. */
export async function createRelatedPost(input: CreateRelatedPostInput): Promise<Post> {
  const response = await httpClient.post<Post>('/posts', input)
  return response.data
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

// Muchas tarjetas apuntan al mismo post original (por ejemplo, todas las respuestas de un hilo): se pide una sola vez.
const relatedPosts = new Map<number, Promise<Post>>()

/** Igual que getPost, pero comparte la petición entre tarjetas. Un error no se guarda, para poder reintentar. */
export function getPostOnce(id: number): Promise<Post> {
  let request = relatedPosts.get(id)
  if (!request) {
    request = getPost(id).catch((reason: unknown) => {
      relatedPosts.delete(id)
      throw reason
    })
    relatedPosts.set(id, request)
  }
  return request
}

export async function listPostReplies(id: number, params: PaginationParams = {}, signal?: AbortSignal): Promise<Paginated<Post>> {
  const response = await httpClient.get<Paginated<Post>>(`/posts/${id}/replies`, { params: toPageQuery(params), signal })
  return response.data
}

export async function deletePost(id: number): Promise<void> {
  await httpClient.delete(`/posts/${id}`)
  // Si era el original de otras tarjetas, que no se siga mostrando.
  relatedPosts.delete(id)
}
