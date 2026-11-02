import type {
  Community,
  Profile,
} from '../../communities/model/community.types';

export interface Post {
  id: number;
  ownerId: number;
  owner: Profile;
  communityId: number | null;
  community: Community | null;
  content: string | null;
  likes: number;
  repostCount: number;
  commentCount: number;
  createdAt: string;
}
