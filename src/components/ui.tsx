import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconMinus, IconPlus } from './Icons'

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

function useEscape(onClose?: () => void) {
  useEffect(() => {
    if (!onClose) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Sheet(props: {
  title: ReactNode
  subtitle?: ReactNode
  onClose?: () => void
  closeLabel?: string
  footer?: ReactNode
  full?: boolean
  children: ReactNode
}) {
  useEscape(props.onClose)
  return createPortal(
    <>
      <div className="backdrop" onClick={props.onClose} />
      <section className={`sheet${props.full ? ' full' : ''}`} role="dialog" aria-modal="true">
        <header className="sheet-head">
          <div>
            <h2>{props.title}</h2>
            {props.subtitle && <p>{props.subtitle}</p>}
          </div>
          {props.onClose && (
            <button className="icon-btn" onClick={props.onClose} aria-label={props.closeLabel ?? 'Close'}>
              <IconClose />
            </button>
          )}
        </header>
        <div className="sheet-body">{props.children}</div>
        {props.footer && <div className="sheet-foot">{props.footer}</div>}
      </section>
    </>,
    document.body,
  )
}

export function Dialog(props: { title: string; body?: ReactNode; children: ReactNode; onClose?: () => void }) {
  useEscape(props.onClose)
  return createPortal(
    <>
      <div className="backdrop dialog-backdrop" onClick={props.onClose} />
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={props.title}>
        <h2>{props.title}</h2>
        {props.body && <p>{props.body}</p>}
        {props.children}
      </div>
    </>,
    document.body,
  )
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [text, onDone])
  return createPortal(
    <div className="toast" role="status" onClick={onDone}>
      {text}
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Segmented<T extends string | number>(props: {
  value: T
  options: { value: T; label: string; big?: boolean }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.value}
          className={o.big ? 'big' : undefined}
          aria-pressed={o.value === props.value}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SwitchRow(props: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="row" role="switch" aria-checked={props.checked} onClick={() => props.onChange(!props.checked)}>
      <span className="grow">
        <span className="label">{props.label}</span>
        {props.sub && <span className="sub" style={{ display: 'block' }}>{props.sub}</span>}
      </span>
      <span className="switch" data-on={props.checked} />
    </button>
  )
}

export function StepperRow(props: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="row">
      <span className="grow label">{props.label}</span>
      <div className="stepper">
        <button
          aria-label={`Fewer ${props.label.toLowerCase()}`}
          disabled={props.value <= props.min}
          onClick={() => props.onChange(props.value - 1)}
        >
          <IconMinus />
        </button>
        <output className="num" aria-live="polite">{props.value}</output>
        <button
          aria-label={`More ${props.label.toLowerCase()}`}
          disabled={props.value >= props.max}
          onClick={() => props.onChange(props.value + 1)}
        >
          <IconPlus />
        </button>
      </div>
    </div>
  )
}

export function StatGrid({ items }: { items: [string, string | number][] }) {
  return (
    <div className="stat-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <b className="num">{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export const fmt1 = (n: number) => n.toFixed(1)
