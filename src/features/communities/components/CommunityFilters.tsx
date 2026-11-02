interface CommunityFiltersProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function CommunityFilters({ value, onChange, onSubmit }: CommunityFiltersProps) {
  return (
    <form
      className="community-filters"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="community-search">Buscar por nombre</label>
      <div className="community-filters__row">
        <input
          id="community-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej. ciencia ficción"
        />
        <button type="submit" className="button button--primary">Buscar</button>
      </div>
    </form>
  )
}
