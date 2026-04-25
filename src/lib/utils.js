export function formatRupiah(amount) {
  if (amount === null || amount === undefined) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(dateStr))
}

export function formatShortDate(dateStr) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short'
  }).format(new Date(dateStr))
}

export function getMonthName(month, year) {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}

export function getCurrentMonth() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function getAvatarColor(name) {
  const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']
  const index = (name || '').charCodeAt(0) % colors.length
  return colors[index]
}
