import { formatRupiah, getMonthName, getInitials, getAvatarColor } from './utils'

/* ══════════════════════════════════════════════════════════════
   Palet — disamakan dengan tema aplikasi (index.css)
══════════════════════════════════════════════════════════════ */
const C = {
  bg: [13, 15, 20],
  card: [19, 22, 25],
  card2: [26, 29, 36],
  zebra: [22, 25, 31],
  border: [44, 38, 26],
  text: [245, 240, 232],
  sub: [160, 160, 184],
  muted: [122, 122, 140],
  gold: [245, 166, 35],
  gold2: [247, 192, 85],
  green: [74, 222, 128],
  red: [248, 113, 113],
}
const PIE_COLORS = ['#f5a623', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#f87171', '#06b6d4', '#fbbf24', '#e879f9']

/* ── Helpers umum ─────────────────────────────────────────── */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const money = v => formatRupiah(Math.round(v || 0)).replace(/\u00a0/g, ' ')
const clean = s => String(s ?? '').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim()
const compact = v => v >= 1e6 ? `${+(v / 1e6).toFixed(2)}jt` : v >= 1e3 ? `${Math.round(v / 1e3)}rb` : String(Math.round(v))
const fmtDate = s => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s + 'T00:00:00'))
const pctText = (v, total) => {
  const p = total > 0 ? (v / total) * 100 : 0
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`
}

function nowLabel() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

function niceScale(max) {
  if (!max || max <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(max)))
  const f = max / exp
  const nf = [1, 2, 4, 5, 8, 10].find(x => f <= x) || 10
  return nf * exp
}

function sortedTx(d) {
  return [...d.transactions].sort((a, b) =>
    a.date.localeCompare(b.date) || (a.created_at || '').localeCompare(b.created_at || ''))
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/* ══════════════════════════════════════════════════════════════
   CSV
══════════════════════════════════════════════════════════════ */
function csvCell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s // cegah formula injection di Excel
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

function buildCsv(d) {
  const L = []
  const row = (...c) => L.push(c.map(csvCell).join(','))
  const gap = () => L.push('')
  const period = getMonthName(d.month, d.year)
  const net = d.totalIncome - d.totalExpense
  const incN = d.transactions.filter(t => t.type === 'income').length
  const expN = d.transactions.filter(t => t.type === 'expense').length
  const who = t => d.profiles[t.user_id]?.name || ''

  L.push('sep=,') // supaya Excel (locale apa pun) memisah kolom dengan benar
  row('DOMPET BERSAMA - LAPORAN KEUANGAN')
  row('Periode', period)
  row('Dibuat pada', nowLabel())

  gap(); row('RINGKASAN')
  row('Keterangan', 'Nilai')
  row('Total Pemasukan (Rp)', Math.round(d.totalIncome))
  row('Total Pengeluaran (Rp)', Math.round(d.totalExpense))
  row('Selisih (Rp)', Math.round(net))
  row('Status', net >= 0 ? 'Surplus' : 'Defisit')
  row('Total Transaksi', d.transactions.length)
  row('Transaksi Pemasukan', incN)
  row('Transaksi Pengeluaran', expN)
  row('Rata-rata Pengeluaran per Hari (Rp)', Math.round(d.totalExpense / d.daysInMonth))

  gap(); row('PERBANDINGAN DENGAN RATA-RATA 3 BULAN SEBELUMNYA')
  if (d.hasAvgData) {
    row('Keterangan', 'Nilai')
    row(`Akumulasi pengeluaran sampai hari ke-${d.lastDay} (Rp)`, Math.round(d.currentAtToday))
    row(`Rata-rata 3 bulan sampai hari ke-${d.lastDay} (Rp)`, d.avgAtToday != null ? Math.round(d.avgAtToday) : '')
    row('Selisih (Rp)', d.diffVsAvg != null ? Math.round(d.diffVsAvg) : '')
    row('Selisih (%)', d.diffPct != null ? (d.diffVsAvg > 0 ? d.diffPct : -d.diffPct) : '')
    d.prevMonths.forEach(p => row(`Total pengeluaran ${p.label} (Rp)`, Math.round(p.total)))
    row('Rata-rata pengeluaran per bulan (Rp)', Math.round(d.avgMonthly))
  } else {
    row('Perbandingan tersedia setelah ada data dari bulan-bulan sebelumnya')
  }

  gap(); row('KOMPOSISI PENGELUARAN')
  row('Kategori', 'Jumlah (Rp)', 'Persentase (%)')
  d.pieData.forEach(p => row(p.name, Math.round(p.value), d.totalExpense > 0 ? Math.round(p.value / d.totalExpense * 100) : 0))

  gap(); row('AKTIVITAS HARIAN')
  row('Tanggal', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Selisih (Rp)')
  d.dailyData.forEach(x => {
    const date = `${d.year}-${String(d.month).padStart(2, '0')}-${String(x.date).padStart(2, '0')}`
    row(date, Math.round(x.income), Math.round(x.expense), Math.round(x.income - x.expense))
  })

  gap(); row('AKUMULASI PENGELUARAN HARIAN')
  row('Hari ke-', 'Bulan ini (Rp)', 'Rata-rata 3 bulan lalu (Rp)')
  d.cumulativeData.forEach(x => row(x.day, x.current, x.avg))

  gap(); row('KONTRIBUSI PER ORANG')
  row('Nama', 'Pengeluaran (Rp)', 'Pemasukan (Rp)', 'Jumlah Transaksi')
  d.personData.forEach(p => row(p.name, Math.round(p.expense), Math.round(p.income), p.count))

  gap(); row('PENGELUARAN TERBESAR')
  row('Peringkat', 'Tanggal', 'Kategori', 'Catatan', 'Dicatat oleh', 'Jumlah (Rp)')
  d.topExpenses.forEach((t, i) => row(i + 1, t.date, t.categories?.name || '', t.note || '', who(t), Math.round(Number(t.amount))))

  gap(); row('SEMUA TRANSAKSI')
  row('Tanggal', 'Jenis', 'Kategori', 'Jumlah (Rp)', 'Catatan', 'Dicatat oleh')
  sortedTx(d).forEach(t => row(
    t.date,
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.categories?.name || '',
    Math.round(Number(t.amount)),
    t.note || '',
    who(t),
  ))
  row('TOTAL PEMASUKAN', '', '', Math.round(d.totalIncome))
  row('TOTAL PENGELUARAN', '', '', Math.round(d.totalExpense))

  return L.join('\r\n')
}

/* ══════════════════════════════════════════════════════════════
   PDF
══════════════════════════════════════════════════════════════ */
const W = 210, H = 297, ML = 14, MR = 14, CW = W - ML - MR, TOP = 22, BOTTOM = 16

async function buildPdf(d) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const period = getMonthName(d.month, d.year)
  const n = d.daysInMonth
  const net = d.totalIncome - d.totalExpense
  const incN = d.transactions.filter(t => t.type === 'income').length
  const expN = d.transactions.filter(t => t.type === 'expense').length
  const painted = new Set()
  let y = 0

  doc.setProperties({
    title: `Laporan Keuangan ${period} - Dompet Bersama`,
    subject: `Laporan keuangan ${period}`,
    author: 'Dompet Bersama',
  })

  /* ── primitif ── */
  const T = (s, x, yy, { size = 8, bold = false, color = C.text, align = 'left' } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(clean(s), x, yy, { align })
  }
  const fit = (s, maxW) => {
    let t = clean(s)
    if (doc.getTextWidth(t) <= maxW) return t
    while (t.length > 1 && doc.getTextWidth(t + '...') > maxW) t = t.slice(0, -1)
    return t.trimEnd() + '...'
  }
  const fitFont = (txt, maxW, size, min = 6.5) => {
    let s = size
    doc.setFontSize(s)
    while (doc.getTextWidth(txt) > maxW && s > min) { s -= 0.5; doc.setFontSize(s) }
    return s
  }
  const alpha = o => doc.setGState(new doc.GState({ opacity: o }))
  const card = (x, yy, w, h, r = 3) => {
    doc.setFillColor(...C.card); doc.setDrawColor(...C.border); doc.setLineWidth(0.25)
    doc.roundedRect(x, yy, w, h, r, r, 'FD')
  }
  const poly = (pts, style = 'S', closed = false) => {
    if (pts.length < 2) return
    const segs = []
    for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]])
    doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, closed)
  }
  const slice = (cx, cy, r, a0, a1) => {
    const steps = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 60)))
    const pts = [[cx, cy]]
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps)
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
    poly(pts, 'FD', true)
  }

  /* ── halaman ── */
  function paint(first = false) {
    const pg = doc.internal.getNumberOfPages()
    if (painted.has(pg)) return
    painted.add(pg)
    doc.setFillColor(...C.bg); doc.rect(0, 0, W, H, 'F')
    for (let i = 0; i < 7; i++) { // glow emas di pojok kanan atas
      alpha(0.028); doc.setFillColor(...C.gold); doc.circle(W - 10, 0, 95 - i * 13, 'F')
    }
    alpha(1)
    doc.setFillColor(...C.gold); doc.rect(0, 0, W, 1.1, 'F')
    if (!first) {
      T('DOMPET BERSAMA', ML, 11, { size: 8, bold: true, color: C.gold })
      T(`Laporan ${period}`, W - MR, 11, { size: 8, color: C.muted, align: 'right' })
      doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(ML, 14, W - MR, 14)
    }
  }
  function ensure(h) {
    if (y + h > H - BOTTOM) { doc.addPage(); paint(); y = TOP + 2 }
  }
  function section(title, sub) {
    ensure(14)
    doc.setFillColor(...C.gold); doc.roundedRect(ML, y - 3.2, 1.2, 4.4, 0.6, 0.6, 'F')
    T(title.toUpperCase(), ML + 3.5, y, { size: 8.5, bold: true, color: C.muted })
    if (sub) T(sub, W - MR, y, { size: 7.5, color: C.muted, align: 'right' })
    y += 5
  }
  function legendRight(items, xRight, yy) {
    let x = xRight
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8)
    ;[...items].reverse().forEach(it => {
      const w = doc.getTextWidth(it.label)
      T(it.label, x, yy, { size: 6.8, color: C.sub, align: 'right' })
      x -= w + 2.2
      if (it.dash) {
        doc.setDrawColor(...it.color); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 0.9], 0)
        doc.line(x - 4.5, yy - 1.1, x, yy - 1.1); doc.setLineDashPattern([], 0); x -= 7
      } else {
        doc.setFillColor(...it.color); doc.circle(x - 0.9, yy - 1.1, 0.95, 'F'); x -= 4.4
      }
    })
  }

  /* ══ HALAMAN 1 — cover ══ */
  paint(true)
  T('DOMPET BERSAMA', ML, 15, { size: 9, bold: true, color: C.gold })
  T('Eto & Noni  ·  Keuangan Rumah Tangga', ML, 19.5, { size: 7.5, color: C.muted })
  T(`Dibuat ${nowLabel()}`, W - MR, 15, { size: 7.5, color: C.muted, align: 'right' })
  T('Laporan Keuangan', ML, 35, { size: 25, bold: true })
  T(period, ML, 44, { size: 14, bold: true, color: C.gold2 })
  for (let i = 0; i < 60; i++) { // divider gradasi emas
    doc.setFillColor(...mix(C.gold, C.bg, i / 60))
    doc.rect(ML + i * (CW / 60), 51, CW / 60 + 0.2, 0.55, 'F')
  }
  y = 61

  /* ── Kartu ringkasan ── */
  {
    const gap = 4, w = (CW - gap * 3) / 4, h = 23
    const stats = [
      { label: 'Pemasukan', value: money(d.totalIncome), color: C.green, sub: `${incN} transaksi` },
      { label: 'Pengeluaran', value: money(d.totalExpense), color: C.red, sub: `${expN} transaksi` },
      { label: 'Selisih', value: money(net), color: net >= 0 ? C.green : C.red, sub: net >= 0 ? 'Surplus' : 'Defisit' },
      { label: 'Total Transaksi', value: String(d.transactions.length), color: C.gold, sub: `${incN} masuk · ${expN} keluar` },
    ]
    stats.forEach((s, i) => {
      const x = ML + i * (w + gap)
      card(x, y, w, h)
      T(s.label.toUpperCase(), x + 4, y + 7, { size: 6.3, bold: true, color: C.muted })
      doc.setFont('helvetica', 'bold')
      const fs = fitFont(s.value, w - 8, 11.5)
      T(s.value, x + 4, y + 15, { size: fs, bold: true, color: s.color })
      T(s.sub, x + 4, y + 19.8, { size: 6.5, color: C.muted })
    })
    y += h + 10
  }

  /* ── Aktivitas harian ── */
  {
    const h = 66
    ensure(h + 12)
    section('Aktivitas Harian', `${n} hari`)
    const top = y
    card(ML, top, CW, h)
    legendRight([{ label: 'Pemasukan', color: C.green }, { label: 'Pengeluaran', color: C.gold }], ML + CW - 5, top + 7)
    const px = ML + 16, pw = CW - 16 - 6, py = top + 15, ph = h - 15 - 9
    const maxV = Math.max(0, ...d.dailyData.map(x => Math.max(x.income, x.expense)))
    const nice = niceScale(maxV)
    for (let i = 0; i <= 4; i++) {
      const gy = py + ph - (i * ph) / 4
      doc.setDrawColor(...C.border); doc.setLineWidth(0.15); doc.line(px, gy, px + pw, gy)
      T(compact((nice * i) / 4), px - 2, gy + 1.2, { size: 6, color: C.muted, align: 'right' })
    }
    const sw = pw / n, bw = Math.min(sw * 0.38, 3.2)
    d.dailyData.forEach((x, i) => {
      const cx = px + sw * (i + 0.5)
      if (x.income > 0) {
        const bh = Math.max((x.income / nice) * ph, 0.4)
        doc.setFillColor(...C.green); doc.rect(cx - bw - 0.1, py + ph - bh, bw, bh, 'F')
      }
      if (x.expense > 0) {
        const bh = Math.max((x.expense / nice) * ph, 0.4)
        doc.setFillColor(...C.gold); doc.rect(cx + 0.1, py + ph - bh, bw, bh, 'F')
      }
      if (i === 0 || (i + 1) % 5 === 0) T(String(i + 1), cx, py + ph + 4.6, { size: 6, color: C.muted, align: 'center' })
    })
    y = top + h + 9
  }

  /* ── Komposisi pengeluaran (donut) ── */
  {
    let rows = d.pieData
    if (rows.length > 10) {
      const rest = rows.slice(9).reduce((s, r) => s + r.value, 0)
      rows = [...rows.slice(0, 9), { name: `Lainnya (${d.pieData.length - 9})`, value: rest }]
    }
    const rh = 6.4
    const h = Math.max(54, 14 + rows.length * rh)
    ensure(h + 12)
    section('Komposisi Pengeluaran', rows.length ? money(d.totalExpense) : '')
    const top = y
    card(ML, top, CW, rows.length ? h : 22)
    if (!rows.length) {
      T('Belum ada pengeluaran di bulan ini', ML + CW / 2, top + 13, { size: 8.5, color: C.muted, align: 'center' })
      y = top + 22 + 9
    } else {
      const cx = ML + 33, cy = top + h / 2, R = 21, r = 13.5
      let a0 = -Math.PI / 2
      doc.setLineWidth(0.5); doc.setDrawColor(...C.card)
      rows.forEach((row, i) => {
        const a1 = a0 + (row.value / d.totalExpense) * Math.PI * 2
        doc.setFillColor(...hex(PIE_COLORS[i % PIE_COLORS.length]))
        if (rows.length === 1) { doc.circle(cx, cy, R, 'F') } else { slice(cx, cy, R, a0, a1) }
        a0 = a1
      })
      doc.setFillColor(...C.card); doc.circle(cx, cy, r, 'F')
      T('TOTAL', cx, cy - 1.2, { size: 5.5, bold: true, color: C.muted, align: 'center' })
      doc.setFont('helvetica', 'bold')
      const txt = money(d.totalExpense)
      const fs = fitFont(txt, r * 2 - 4, 6.8, 5)
      T(txt, cx, cy + 3.2, { size: fs, bold: true, color: C.gold2, align: 'center' })

      const startY = top + (h - rows.length * rh) / 2
      const nameX = ML + 70, amtRight = ML + CW - 17, pctRight = ML + CW - 5
      rows.forEach((row, i) => {
        const ry = startY + i * rh + rh / 2 + 1
        doc.setFillColor(...hex(PIE_COLORS[i % PIE_COLORS.length])); doc.circle(ML + 66, ry - 1, 1.3, 'F')
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        T(fit(row.name, amtRight - 28 - nameX), nameX, ry, { size: 8, color: C.sub })
        T(money(row.value), amtRight, ry, { size: 8, bold: true, align: 'right' })
        T(pctText(row.value, d.totalExpense), pctRight, ry, { size: 7, color: C.muted, align: 'right' })
        if (i < rows.length - 1) { doc.setDrawColor(...C.border); doc.setLineWidth(0.12); doc.line(ML + 64, ry + 2.2, ML + CW - 5, ry + 2.2) }
      })
      y = top + h + 9
    }
  }

  /* ── Akumulasi pengeluaran ── */
  {
    const h = d.hasAvgData ? 102 : 90
    ensure(h + 12)
    section('Akumulasi Pengeluaran')
    const top = y
    card(ML, top, CW, h)

    // subtitle + badge
    let badgeW = 0
    if (d.diffVsAvg != null) {
      const diff = d.diffVsAvg
      const col = diff > 0 ? C.red : diff < 0 ? C.green : C.muted
      const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
      const pct = d.diffPct != null && diff !== 0 ? ` (${sign}${d.diffPct}%)` : ''
      const txt = `${sign}${money(Math.abs(diff))}${pct} vs rata-rata`
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
      badgeW = doc.getTextWidth(clean(txt)) + 8
      doc.setFillColor(...mix(C.card, col, 0.12)); doc.setDrawColor(...mix(C.card, col, 0.38)); doc.setLineWidth(0.25)
      doc.roundedRect(ML + CW - 5 - badgeW, top + 3.4, badgeW, 6.4, 3.2, 3.2, 'FD')
      T(txt, ML + CW - 5 - badgeW / 2, top + 7.6, { size: 7, bold: true, color: col, align: 'center' })
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    T(fit(`Dibandingkan rata-rata ${d.avgMonthNames.join(', ')}`, CW - 10 - badgeW - 4), ML + 5, top + 7.6, { size: 7, color: C.muted })

    legendRight([
      { label: 'Bulan ini', color: C.gold },
      { label: 'Rata-rata 3 bulan lalu', color: [150, 152, 165], dash: true },
    ], ML + CW - 5, top + 16)

    const px = ML + 17, pw = CW - 17 - 8, py = top + 22, ph = 50
    const vals = d.cumulativeData.flatMap(p => [p.current, p.avg]).filter(v => v != null)
    const nice = niceScale(Math.max(0, ...vals))
    const X = day => px + ((day - 1) / (n - 1)) * pw
    const Y = v => py + ph - (v / nice) * ph

    for (let i = 0; i <= 4; i++) {
      const gy = py + ph - (i * ph) / 4
      doc.setDrawColor(...C.border); doc.setLineWidth(0.15); doc.line(px, gy, px + pw, gy)
      T(compact((nice * i) / 4), px - 2, gy + 1.2, { size: 6, color: C.muted, align: 'right' })
    }
    for (let dd = 1; dd <= n; dd++) {
      if (dd === 1 || dd % 5 === 0) T(String(dd), X(dd), py + ph + 4.6, { size: 6, color: C.muted, align: 'center' })
    }

    const curPts = d.cumulativeData.filter(p => p.current != null).map(p => [X(p.day), Y(p.current)])
    const avgPts = d.cumulativeData.filter(p => p.avg != null).map(p => [X(p.day), Y(p.avg)])

    if (curPts.length > 1) { // area di bawah garis
      alpha(0.14); doc.setFillColor(...C.gold)
      poly([...curPts, [curPts[curPts.length - 1][0], py + ph], [curPts[0][0], py + ph]], 'F', true)
      alpha(1)
    }
    if (d.isCurrentMonth && d.todayDay < n) { // garis "hari ini"
      doc.setDrawColor(110, 110, 125); doc.setLineWidth(0.25); doc.setLineDashPattern([1.2, 1], 0)
      doc.line(X(d.todayDay), py, X(d.todayDay), py + ph); doc.setLineDashPattern([], 0)
      T('Hari ini', X(d.todayDay) - 1.5, py + 3, { size: 6, color: C.muted, align: 'right' })
    }
    doc.setLineJoin('round'); doc.setLineCap('round')
    if (d.hasAvgData && avgPts.length > 1) {
      doc.setDrawColor(150, 152, 165); doc.setLineWidth(0.45); doc.setLineDashPattern([1.6, 1.2], 0)
      poly(avgPts); doc.setLineDashPattern([], 0)
    }
    if (curPts.length > 1) {
      doc.setDrawColor(...C.gold); doc.setLineWidth(0.85); poly(curPts)
      const last = curPts[curPts.length - 1]
      doc.setFillColor(...C.gold2); doc.setDrawColor(...C.card); doc.setLineWidth(0.5); doc.circle(last[0], last[1], 1.2, 'FD')
    }

    // baris konteks bulan-bulan sebelumnya
    const cy = py + ph + 10
    if (d.hasAvgData) {
      doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(ML + 5, cy, ML + CW - 5, cy)
      const cells = [...d.prevMonths.map(p => ({ label: p.label, value: money(p.total), color: C.sub })),
        { label: 'Rata-rata/bulan', value: money(d.avgMonthly), color: C.gold }]
      const cw = (CW - 10) / 4
      cells.forEach((c, i) => {
        const x = ML + 5 + i * cw
        if (i > 0) { doc.setDrawColor(...C.border); doc.line(x, cy + 3, x, cy + 14) }
        T(c.label.toUpperCase(), x + (i > 0 ? 4 : 0), cy + 7, { size: 5.8, bold: true, color: C.muted })
        doc.setFont('helvetica', 'bold')
        const fs = fitFont(c.value, cw - 6, 8.5, 6)
        T(c.value, x + (i > 0 ? 4 : 0), cy + 12.5, { size: fs, bold: true, color: c.color })
      })
    } else {
      T('Perbandingan akan muncul setelah ada data dari 3 bulan sebelumnya.', ML + 5, cy + 3, { size: 7.5, color: C.muted })
    }
    y = top + h + 9
  }

  /* ── Kontribusi per orang ── */
  if (d.personData.length > 0) {
    const gap = 4, w = (CW - gap) / 2, h = 29
    const rowsN = Math.ceil(d.personData.length / 2)
    ensure(rowsN * (h + gap) + 12)
    section('Kontribusi per Orang')
    d.personData.forEach((p, i) => {
      const x = ML + (i % 2) * (w + gap)
      const yy = y + Math.floor(i / 2) * (h + gap)
      card(x, yy, w, h)
      doc.setFillColor(...hex(getAvatarColor(p.name))); doc.circle(x + 9.5, yy + 9.5, 4.6, 'F')
      T(getInitials(p.name), x + 9.5, yy + 11, { size: 7, bold: true, color: [255, 255, 255], align: 'center' })
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
      T(fit(p.name, w - 26), x + 17.5, yy + 8.5, { size: 9.5, bold: true })
      T(`${p.count} transaksi`, x + 17.5, yy + 13, { size: 7, color: C.muted })
      T('Pengeluaran', x + 5, yy + 20, { size: 7.5, color: C.muted })
      T(money(p.expense), x + w - 5, yy + 20, { size: 8.5, bold: true, color: C.red, align: 'right' })
      T('Pemasukan', x + 5, yy + 25, { size: 7.5, color: C.muted })
      T(money(p.income), x + w - 5, yy + 25, { size: 8.5, bold: true, color: C.green, align: 'right' })
    })
    y += rowsN * (h + gap) + 6
  }

  /* ── tabel (dipakai Top 5 & Semua Transaksi) ── */
  function table(opts) {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR, top: TOP, bottom: BOTTOM },
      theme: 'plain',
      styles: {
        font: 'helvetica', fontSize: 7.8, textColor: C.text, fillColor: C.card, valign: 'middle',
        cellPadding: { top: 2.3, bottom: 2.3, left: 2.6, right: 2.6 },
        lineColor: C.border, lineWidth: { bottom: 0.15 },
      },
      headStyles: { fillColor: C.card2, textColor: C.gold, fontStyle: 'bold', fontSize: 6.8, lineColor: [96, 70, 26], lineWidth: { bottom: 0.4 } },
      alternateRowStyles: { fillColor: C.zebra },
      willDrawPage: () => paint(),
      ...opts,
    })
    y = doc.lastAutoTable.finalY + 9
  }
  const who = t => d.profiles[t.user_id]?.name || '-'

  /* ── Pengeluaran terbesar ── */
  if (d.topExpenses.length > 0) {
    ensure(44)
    section('Pengeluaran Terbesar', `Top ${d.topExpenses.length}`)
    table({
      head: [['#', 'KATEGORI', 'CATATAN', 'OLEH', 'TANGGAL', 'JUMLAH']],
      body: d.topExpenses.map((t, i) => [i + 1, clean(t.categories?.name) || '-', clean(t.note) || '-', clean(who(t)), fmtDate(t.date), money(Number(t.amount))]),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center', textColor: C.muted, fontStyle: 'bold' },
        1: { cellWidth: 36, fontStyle: 'bold' },
        3: { cellWidth: 24, textColor: C.sub },
        4: { cellWidth: 26, textColor: C.sub },
        5: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: C.red },
      },
    })
  }

  /* ── Semua transaksi ── */
  const txs = sortedTx(d)
  if (txs.length > 0) {
    ensure(44)
    section('Semua Transaksi', `${txs.length} transaksi · ${period}`)
    table({
      head: [['TANGGAL', 'KATEGORI', 'CATATAN', 'OLEH', 'JENIS', 'JUMLAH']],
      body: txs.map(t => [
        fmtDate(t.date), clean(t.categories?.name) || '-', clean(t.note) || '-', clean(who(t)),
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `${t.type === 'income' ? '+' : '-'}${money(Number(t.amount))}`,
      ]),
      columnStyles: {
        0: { cellWidth: 24, textColor: C.sub },
        1: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 20, textColor: C.sub },
        4: { cellWidth: 23, textColor: C.muted },
        5: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: h => {
        if (h.section === 'body' && h.column.index === 5) {
          h.cell.styles.textColor = txs[h.row.index].type === 'income' ? C.green : C.red
        }
      },
    })
    // ringkasan akhir
    ensure(20)
    card(ML, y - 3, CW, 14)
    const third = CW / 3
    ;[['Total Pemasukan', money(d.totalIncome), C.green], ['Total Pengeluaran', money(d.totalExpense), C.red], ['Selisih', money(net), net >= 0 ? C.green : C.red]]
      .forEach(([l, v, c], i) => {
        const x = ML + 5 + i * third
        T(l.toUpperCase(), x, y + 2.2, { size: 6, bold: true, color: C.muted })
        T(v, x, y + 7.2, { size: 9, bold: true, color: c })
      })
    y += 16
  }

  /* ── footer semua halaman ── */
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(ML, H - 11, W - MR, H - 11)
    T('Dompet Bersama  ·  Eto & Noni', ML, H - 6.5, { size: 7, color: C.muted })
    T(`Halaman ${i} dari ${total}`, W - MR, H - 6.5, { size: 7, color: C.muted, align: 'right' })
  }
  return doc
}

/* ══════════════════════════════════════════════════════════════
   Entry point
══════════════════════════════════════════════════════════════ */
export async function exportReport(format, d) {
  const base = `laporan-dompet-bersama-${d.year}-${String(d.month).padStart(2, '0')}`
  await new Promise(r => setTimeout(r, 80)) // beri waktu UI menampilkan status "menyiapkan"
  if (format === 'csv') {
    const blob = new Blob(['\ufeff' + buildCsv(d)], { type: 'text/csv;charset=utf-8;' })
    download(blob, `${base}.csv`)
  } else {
    const doc = await buildPdf(d)
    doc.save(`${base}.pdf`)
  }
}