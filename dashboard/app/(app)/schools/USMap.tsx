'use client'

import { useMemo, useState } from 'react'
import type { Assignment, Stage } from './Pipeline'

const STAGE_COLOR: Record<Stage, string> = {
  interested: '#6B7280',
  talks: '#132F88',
  offer: '#E11D2A',
}

const STAGE_LABEL: Record<Stage, string> = {
  interested: 'Intéressés par toi',
  talks: 'En échange',
  offer: 'Offre reçue',
}

const US_OUTLINE =
  'M 82,37 L 114,28 L 200,23 L 308,23 L 462,23 L 538,23 L 546,14 L 600,58 L 700,81 L 723,192 L 769,185 L 786,164 L 831,139 L 846,115 L 900,115 L 938,69 L 969,115 L 938,138 L 911,162 L 923,192 L 885,210 L 862,219 L 846,265 L 826,302 L 838,339 L 800,372 L 771,397 L 752,415 L 748,455 L 762,499 L 766,558 L 743,586 L 741,552 L 728,510 L 723,482 L 692,469 L 658,452 L 646,445 L 615,485 L 542,478 L 502,512 L 500,556 L 415,487 L 362,420 L 338,431 L 294,431 L 235,399 L 197,399 L 178,367 L 146,358 L 125,316 L 108,277 L 86,222 L 89,152 L 94,88 Z'

function project(lat: number, lng: number) {
  const x = ((lng + 130) / 65) * 1000
  const y = ((50 - lat) / 26) * 600
  return { x, y }
}

type Pin = {
  assignment: Assignment
  school: NonNullable<Assignment['schools']>
  x: number
  y: number
}

type BBox = { x: number; y: number; w: number; h: number }

function intersects(a: BBox, b: BBox) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  )
}

const LABEL_FONT = 9
const LABEL_LINE_H = 12
const LABEL_PAD_X = 3
// SVG cannot measure text pre-render; approximate width.
function estimateLabelWidth(name: string): number {
  return Math.min(180, name.length * (LABEL_FONT * 0.55) + LABEL_PAD_X * 2)
}

// Anti-overlap tuning. Units are SVG viewBox (1000×600 covering the US).
const PIN_GAP = 7 // gap between pin and label edge
const CLUSTER_RADIUS = 30 // viewBox units — pins closer than this count as neighbours
const CLUSTER_MIN_NEIGHBOURS = 3 // strictly more than 3 pins ⇒ 3+ neighbours of any given pin

type Anchor = 'right' | 'bottom' | 'top' | 'left'

function labelBoxFor(
  px: number,
  py: number,
  w: number,
  anchor: Anchor
): BBox {
  switch (anchor) {
    case 'right':
      return { x: px + PIN_GAP, y: py - LABEL_LINE_H / 2, w, h: LABEL_LINE_H }
    case 'left':
      return { x: px - PIN_GAP - w, y: py - LABEL_LINE_H / 2, w, h: LABEL_LINE_H }
    case 'bottom':
      return { x: px - w / 2, y: py + PIN_GAP, w, h: LABEL_LINE_H }
    case 'top':
      return { x: px - w / 2, y: py - PIN_GAP - LABEL_LINE_H, w, h: LABEL_LINE_H }
  }
}

function labelAnchorAttrs(anchor: Anchor, px: number, py: number) {
  switch (anchor) {
    case 'right':
      return { x: px + PIN_GAP, y: py + 3, textAnchor: 'start' as const }
    case 'left':
      return { x: px - PIN_GAP, y: py + 3, textAnchor: 'end' as const }
    case 'bottom':
      return { x: px, y: py + PIN_GAP + LABEL_FONT, textAnchor: 'middle' as const }
    case 'top':
      return { x: px, y: py - PIN_GAP - 2, textAnchor: 'middle' as const }
  }
}

export function USMap({
  assignments,
  onSelect,
}: {
  assignments: Assignment[]
  onSelect: (assignmentId: string) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [forceAllLabels, setForceAllLabels] = useState(false)

  const pins: Pin[] = useMemo(
    () =>
      assignments
        .filter(
          (a) => a.schools && a.schools.lat != null && a.schools.lng != null
        )
        .map((a) => {
          const s = a.schools!
          const { x, y } = project(Number(s.lat), Number(s.lng))
          return { assignment: a, school: s, x, y }
        }),
    [assignments]
  )

  // Anti-overlap pass:
  // 1. Detect dense clusters: any pin with ≥3 neighbours within CLUSTER_RADIUS
  //    has its label suppressed (>3 pins close together → labels off, name on tap).
  // 2. For remaining pins, walk in priority order (lowest ranking first) and try
  //    label positions right → bottom → top → left, keeping the first that fits.
  const { labelPlacement } = useMemo(() => {
    const placement = new Map<string, Anchor>()

    // 1. Cluster detection
    const inDenseCluster = new Set<string>()
    for (let i = 0; i < pins.length; i++) {
      let neighbours = 0
      for (let j = 0; j < pins.length; j++) {
        if (i === j) continue
        const dx = pins[i].x - pins[j].x
        const dy = pins[i].y - pins[j].y
        if (dx * dx + dy * dy < CLUSTER_RADIUS * CLUSTER_RADIUS) {
          neighbours++
          if (neighbours >= CLUSTER_MIN_NEIGHBOURS) break
        }
      }
      if (neighbours >= CLUSTER_MIN_NEIGHBOURS) {
        inDenseCluster.add(pins[i].assignment.id)
      }
    }

    const sorted = [...pins].sort((a, b) => {
      const ra = a.school.ranking ?? 1_000_000
      const rb = b.school.ranking ?? 1_000_000
      if (ra !== rb) return ra - rb
      return a.x - b.x
    })

    // 2. Dynamic placement
    const placed: BBox[] = []
    const ANCHORS: Anchor[] = ['right', 'bottom', 'top', 'left']
    for (const p of sorted) {
      if (inDenseCluster.has(p.assignment.id)) continue
      const w = estimateLabelWidth(p.school.name)
      for (const anchor of ANCHORS) {
        const box = labelBoxFor(p.x, p.y, w, anchor)
        if (placed.some((b) => intersects(b, box))) continue
        placed.push(box)
        placement.set(p.assignment.id, anchor)
        break
      }
    }

    return { labelPlacement: placement }
  }, [pins])

  // Render hovered pin last so its tooltip sits above neighbouring pins.
  const sortedPins = hoverId
    ? [
        ...pins.filter((p) => p.assignment.id !== hoverId),
        ...pins.filter((p) => p.assignment.id === hoverId),
      ]
    : pins

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-line bg-white p-4">
        <svg
          viewBox="0 0 1000 600"
          className="h-auto w-full"
          role="img"
          aria-label="Carte des États-Unis avec les écoles"
        >
          <path
            d={US_OUTLINE}
            fill="var(--cream-2)"
            stroke="var(--line)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {sortedPins.map(({ assignment, school, x, y }) => {
            const color = STAGE_COLOR[assignment.stage]
            const isHover = hoverId === assignment.id
            const computedAnchor = labelPlacement.get(assignment.id)
            const anchor: Anchor =
              computedAnchor ?? (forceAllLabels ? 'right' : 'right')
            const showLabel =
              !isHover && (computedAnchor != null || forceAllLabels)
            const attrs = labelAnchorAttrs(anchor, x, y)
            return (
              <g
                key={assignment.id}
                onMouseEnter={() => setHoverId(assignment.id)}
                onMouseLeave={() =>
                  setHoverId((id) => (id === assignment.id ? null : id))
                }
                onClick={() => onSelect(assignment.id)}
                className="cursor-pointer"
                style={{ touchAction: 'manipulation' }}
              >
                {/* Invisible larger hit target — the visible 5px circle is
                    too small to tap reliably on iOS. */}
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={isHover ? 8 : 5}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                  style={{ transition: 'r 0.15s', pointerEvents: 'none' }}
                >
                  <title>{school.name}</title>
                </circle>
                {showLabel && (
                  <text
                    x={attrs.x}
                    y={attrs.y}
                    textAnchor={attrs.textAnchor}
                    fontSize={LABEL_FONT}
                    fontWeight={600}
                    fill="var(--navy)"
                    stroke="white"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {school.name}
                  </text>
                )}
                {isHover && <Tooltip x={x} y={y} school={school} />}
              </g>
            )
          })}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        {(['interested', 'talks', 'offer'] as Stage[]).map((stage) => (
          <li key={stage} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-white"
              style={{
                backgroundColor: STAGE_COLOR[stage],
                boxShadow: '0 0 0 1px var(--line)',
              }}
            />
            <span className="font-semibold">{STAGE_LABEL[stage]}</span>
          </li>
        ))}
        <li>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px]">
            <input
              type="checkbox"
              checked={forceAllLabels}
              onChange={(e) => setForceAllLabels(e.target.checked)}
              className="h-3 w-3"
            />
            Afficher tous les noms
          </label>
        </li>
        <li className="ml-auto italic">
          {pins.length} école{pins.length > 1 ? 's' : ''} placée
          {pins.length > 1 ? 's' : ''}
        </li>
      </ul>
    </div>
  )
}

function Tooltip({
  x,
  y,
  school,
}: {
  x: number
  y: number
  school: NonNullable<Assignment['schools']>
}) {
  const govDiv = [school.governing_body, school.division]
    .filter(Boolean)
    .join(' ')
  const lines = [
    school.name,
    govDiv || null,
    school.ranking != null && school.ranking < 1000
      ? `🏆 #${school.ranking}`
      : null,
  ].filter((s): s is string => !!s)

  const FONT = 11
  const PAD_X = 8
  const PAD_Y = 6
  const LINE_H = 14
  const widest = Math.max(...lines.map((l) => l.length))
  const width = Math.min(260, Math.max(80, widest * 6.5 + PAD_X * 2))
  const height = lines.length * LINE_H + PAD_Y * 2

  let left = x - width / 2
  let top = y - height - 14
  if (left < 4) left = 4
  if (left + width > 996) left = 996 - width
  if (top < 4) top = y + 14

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={4}
        ry={4}
        fill="var(--navy)"
        opacity={0.92}
      />
      <text
        x={left + PAD_X}
        y={top + PAD_Y + FONT}
        fontSize={FONT}
        fill="white"
      >
        {lines.map((line, idx) => (
          <tspan
            key={idx}
            x={left + PAD_X}
            dy={idx === 0 ? 0 : LINE_H}
            fontWeight={idx === 0 ? 700 : 400}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}
