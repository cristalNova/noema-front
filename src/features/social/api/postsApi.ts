import { httpClient } from '../../../shared/api';
import type { Paginated } from '../../../shared/types/Paginated';
import { toPageQuery } from '../../../shared/utils/pagination';
import type { Post } from '../model/post.types';

export interface PostListParams {
  communityId?: number;
  page?: number;
  limit?: number;
}

export async function listPosts(params: PostListParams = {}) {
  const { page, limit } = toPageQuery(params);
  const response = await httpClient.get<Paginated<Post>>('/posts', {
    params: {
      page,
      limit,
      ...(params.communityId ? { communityId: params.communityId } : {}),
    },
  });
  return response.data;
}
