import { httpClient } from '../../../shared/api';
import type { Paginated } from '../../../shared/types/Paginated';
import { toPageQuery } from '../../../shared/utils/pagination';
import type { Article } from '../model/article.types';

export interface ArticleListParams {
  communityId?: number;
  page?: number;
  limit?: number;
}

export async function listArticles(params: ArticleListParams = {}) {
  const { page, limit } = toPageQuery(params);
  const response = await httpClient.get<Paginated<Article>>('/articles', {
    params: {
      page,
      limit,
      ...(params.communityId ? { communityId: params.communityId } : {}),
    },
  });
  return response.data;
}
