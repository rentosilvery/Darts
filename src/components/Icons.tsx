import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconChart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconPeople = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.6 3 5.2" /></svg>
)
export const IconUndo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
)
export const IconBack = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 5H9l-6 7 6 7h12z" /><path d="m17 9-6 6M11 9l6 6" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconMinus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const IconChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
)

/** Faint dartboard line drawing used behind the live score. */
export const BoardArt = ({ className }: { className?: string }) => {
  const rings = [0.06, 0.13, 0.42, 0.48, 0.66, 0.72, 0.94, 1]
  const spokes = Array.from({ length: 20 }, (_, i) => {
    const a = ((i * 18 + 9) * Math.PI) / 180
    return { x1: 50 + 6.5 * Math.cos(a), y1: 50 + 6.5 * Math.sin(a), x2: 50 + 47 * Math.cos(a), y2: 50 + 47 * Math.sin(a) }
  })
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.35" aria-hidden>
      {rings.map((r) => <circle key={r} cx="50" cy="50" r={r * 47} />)}
      {spokes.map((s, i) => <line key={i} {...s} />)}
    </svg>
  )
}
