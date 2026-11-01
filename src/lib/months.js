// Geser bulan sebanyak n bulan ke belakang (n positif) atau ke depan (n negatif)
export function shiftMonth(month, year, n) {
  let m = month - n
  let y = year
  while (m <= 0) { m += 12; y-- }
  while (m > 12) { m -= 12; y++ }
  return { month: m, year: y }
}

// Contoh: "Okt 2026"
export function shortMonthName(month, year) {
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}
