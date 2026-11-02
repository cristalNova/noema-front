import { httpClient } from '../../../shared/api';
import type { Profile } from '../../communities/model/community.types';

export async function getMyProfile() {
  const response = await httpClient.get<Profile>('/profiles/me');
  return response.data;
}
