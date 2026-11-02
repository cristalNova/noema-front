import type { Community } from '../model/community.types'
import { CommunityCard } from './CommunityCard'

interface CommunityListProps {
  communities: Community[]
}

export function CommunityList({ communities }: CommunityListProps) {
  return (
    <div className="community-grid">
      {communities.map((community) => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  )
}
