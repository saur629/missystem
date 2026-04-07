'use client'
import React from 'react'

// ─── BADGE ────────────────────────────────────────────────────
const BC: Record<string, string> = {
  green:  'rgba(16,185,129,.12) #10b981',
  yellow: 'rgba(245,158,11,.12) #f59e0b',
  red:    'rgba(239,68,68,.12) #ef4444',
  blue:   'rgba(59,130,246,.12) #3b82f6',
  purple: 'rgba(139,92,246,.12) #8b5cf6',
  orange: 'rgba(249,115,22,.12) #f97316',
  teal:   'rgba(20,184,166,.12) #14b8a6',
  gray:   'rgba(255,255,255,.06) #8892a4',
}
export function Badge({ color = 'gray', children }: { color?: string; children: React.ReactNode }) {
  const [bg, fg] = (BC[color] || BC.gray).split(' ')
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{children}</span>
}

// ─── BUTTON ───────────────────────────────────────────────────
export function Button({ variant = 'default', size = 'md', style: s, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger'; size?: 'sm' | 'md' }) {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all .15s', fontSize: size === 'sm' ? 11 : 12, padding: size === 'sm' ? '3px 10px' : '6px 14px' }
  const vs: Record<string, React.CSSProperties> = {
    default: { background: '#1e2535', borderColor: '#2a3348', color: '#e2e8f0' },
    primary: { background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' },
    danger:  { background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.3)', color: '#ef4444' },
  }
  return <button style={{ ...base, ...vs[variant], ...s }} {...props}>{children}</button>
}

// ─── INPUT ────────────────────────────────────────────────────
export function Input({ style: s, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={{ width: '100%', padding: '8px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', ...s }} {...props} />
}

// ─── SELECT ───────────────────────────────────────────────────
export function Select({ style: s, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select style={{ width: '100%', padding: '8px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', ...s }} {...props}>{children}</select>
}

// ─── TEXTAREA ─────────────────────────────────────────────────
export function Textarea({ style: s, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea style={{ width: '100%', padding: '8px 10px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', ...s }} {...props} />
}

// ─── CARD ─────────────────────────────────────────────────────
export function Card({ style: s, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={{ background: '#161b27', border: '1px solid #2a3348', borderRadius: 12, overflow: 'hidden', ...s }}>{children}</div>
}
export function CardHeader({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a3348', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...s }}>{children}</div>
}
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{children}</h3>
}
export function CardBody({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: '14px 16px', ...s }}>{children}</div>
}

// ─── STAT CARD ────────────────────────────────────────────────
const SC: Record<string, string> = { blue: '#3b82f6', green: '#10b981', yellow: '#f59e0b', red: '#ef4444', purple: '#8b5cf6' }
export function StatCard({ label, value, icon, color = 'blue', sub }: { label: string; value: string | number; icon?: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: '#161b27', border: '1px solid #2a3348', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      {icon && <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 20, opacity: 0.35 }}>{icon}</div>}
      <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: SC[color] || SC.blue, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8892a4', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, width = 560 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#161b27', border: '1px solid #2a3348', borderRadius: 12, width, maxHeight: '88vh', overflowY: 'auto' }} className="animate-in">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a3348', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: 14 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: '12px 20px', borderTop: '1px solid #2a3348', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ─── FORM GROUP ───────────────────────────────────────────────
export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

// ─── LOADING ─────────────────────────────────────────────────
export function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(59,130,246,.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── EMPTY ────────────────────────────────────────────────────
export function Empty({ message = 'No data found' }: { message?: string }) {
  return <div style={{ textAlign: 'center', padding: '30px 20px', color: '#8892a4', fontSize: 12 }}>📭 {message}</div>
}

// ─── SECTION ROW ──────────────────────────────────────────────
export function Grid({ cols = 2, gap = 12, children, style: s }: { cols?: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap, ...s }}>{children}</div>
}

// ─── INFO BOX ────────────────────────────────────────────────
export function InfoBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#8892a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: color || '#e2e8f0' }}>{value}</div>
    </div>
  )
}
