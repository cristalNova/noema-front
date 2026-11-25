const SPINES: { w: number; h: number; color: string; band: string; lean?: number }[] = [
  { w: 30, h: 96, color: '#6256a8', band: '#f8f0e2' },
  { w: 22, h: 112, color: '#f3e9db', band: '#8c4f2f' },
  { w: 34, h: 88, color: '#22212b', band: '#e0a96d' },
  { w: 26, h: 104, color: '#d98c9a', band: '#fffdfa' },
  { w: 20, h: 118, color: '#9bb7a8', band: '#22212b' },
  { w: 36, h: 92, color: '#8c4f2f', band: '#f3e9db' },
  { w: 24, h: 108, color: '#fffdfa', band: '#6256a8' },
  { w: 30, h: 98, color: '#4b6a88', band: '#f8f0e2' },
  { w: 22, h: 116, color: '#e0a96d', band: '#22212b' },
  { w: 32, h: 90, color: '#c7c5f4', band: '#6256a8' },
  { w: 26, h: 110, color: '#22212b', band: '#d98c9a' },
  { w: 34, h: 94, color: '#f3e9db', band: '#4b6a88' },
  { w: 22, h: 106, color: '#6256a8', band: '#e0a96d' },
  { w: 30, h: 114, color: '#9bb7a8', band: '#fffdfa' },
  { w: 26, h: 90, color: '#8c4f2f', band: '#f8f0e2' },
  { w: 20, h: 100, color: '#fffdfa', band: '#8c4f2f', lean: 9 },
]

const SHELF_HEIGHT = 124

function buildSpines() {
  let x = 6
  return SPINES.map((spine, index) => {
    const y = SHELF_HEIGHT - spine.h
    const pivotX = x + spine.w
    const transform = spine.lean ? `rotate(${spine.lean} ${pivotX} ${SHELF_HEIGHT})` : undefined
    const node = (
      <g key={index} transform={transform}>
        <rect x={x} y={y} width={spine.w} height={spine.h} rx="3" fill={spine.color} />
        <rect x={x} y={y + 14} width={spine.w} height="5" fill={spine.band} opacity="0.9" />
        <rect x={x} y={y + 22} width={spine.w} height="2" fill={spine.band} opacity="0.55" />
        <rect x={x + spine.w / 2 - 3} y={y + spine.h - 34} width="6" height="20" rx="2" fill={spine.band} opacity="0.75" />
        <rect x={x} y={y} width="2" height={spine.h} rx="1" fill="#fff" opacity="0.25" />
      </g>
    )
    x += spine.w + 3
    return node
  })
}

const SPINES_WIDTH = SPINES.reduce((total, spine) => total + spine.w + 3, 6) + 12

/** Estantería de lomos que separa la portada del resto de la página. */
export function HomeShelf() {
  return (
    <div className="home__spines" aria-hidden="true">
      <svg viewBox={`0 0 ${SPINES_WIDTH} ${SHELF_HEIGHT}`} preserveAspectRatio="xMidYMax meet" role="presentation">
        {buildSpines()}
      </svg>
    </div>
  )
}
