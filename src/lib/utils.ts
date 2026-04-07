export function formatCurrency(amount: number = 0): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

export const ORDER_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:       { label: 'Pending',       color: 'red',    icon: '🔴' },
  DESIGNING:     { label: 'Designing',     color: 'purple', icon: '🎨' },
  DESIGN_DONE:   { label: 'Design Done',   color: 'blue',   icon: '✏️' },
  PRINTING:      { label: 'Printing',      color: 'yellow', icon: '🖨️' },
  PRINT_DONE:    { label: 'Print Done',    color: 'teal',   icon: '📄' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'orange', icon: '🔍' },
  READY:         { label: 'Ready',         color: 'green',  icon: '📦' },
  DELIVERED:     { label: 'Delivered',     color: 'green',  icon: '✅' },
  CANCELLED:     { label: 'Cancelled',     color: 'red',    icon: '❌' },
}

export const PRIORITY_COLOR: Record<string, string> = {
  NORMAL: 'gray', URGENT: 'yellow', EXPRESS: 'red'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
