import type { Profile } from '../model/Profile'

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

export interface ProfileState {
  status: ProfileStatus
  profile: Profile | null
}

export type ProfileAction =
  | { type: 'reset' }
  | { type: 'loading' }
  | { type: 'loaded'; profile: Profile | null }
  | { type: 'failed' }

export const initialProfileState: ProfileState = { status: 'idle', profile: null }

export function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'reset':
      return initialProfileState
    case 'loading':
      return { ...state, status: 'loading' }
    case 'loaded':
      return action.profile
        ? { status: 'ready', profile: action.profile }
        : { status: 'missing', profile: null }
    case 'failed':
      return { status: 'error', profile: null }
  }
}
