import { History, Layers, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { getCurrentMonth, getMonthName } from '../lib/utils'
import { shiftMonth, shortMonthName } from '../lib/months'
import './ComparePicker.css'

const TABS = [
  { key: 'avg3', title: 'Rata-rata', Icon: Layers },
  { key: 'prev1', title: 'Bulan lalu', Icon: History },
  { key: 'custom', title: 'Pilih bulan', Icon: Calendar },
]

const keyOf = m => `${m.year}-${m.month}`

/**
 * Props:
 *  mode            'avg3' | 'prev1' | 'custom'
 *  onModeChange    (mode) => void
 *  month, year     bulan yang sedang dilihat (tidak boleh jadi pembanding)
 *  customMonth     { month, year } bulan pembanding untuk mode 'custom'
 *  onCustomChange  ({ month, year }) => void
 */
export default function ComparePicker({ mode, onModeChange, month, year, customMonth, onCustomChange }) {
  const now = getCurrentMonth()

  // Pilihan: 60 bulan terakhir (dari bulan berjalan), kecuali bulan yang sedang dilihat
  const options = []
  for (let i = 0; i < 60; i++) {
    const o = shiftMonth(now.month, now.year, i)
    if (o.month === month && o.year === year) continue
    options.push(o)
  }
  const years = [...new Set(options.map(o => o.year))]
  const idx = options.findIndex(o => keyOf(o) === keyOf(customMonth))

  const prev = shiftMonth(month, year, 1)
  const sub = {
    avg3: '3 bulan terakhir',
    prev1: shortMonthName(prev.month, prev.year),
    custom: shortMonthName(customMonth.month, customMonth.year),
  }

  function step(target) {
    if (target >= 0 && target < options.length) onCustomChange(options[target])
  }

  return (
    <div className="cmp-picker">
      <div className="cmp-tabs" role="tablist" aria-label="Pembanding akumulasi pengeluaran">
        {TABS.map(({ key, title, Icon }) => {
          const active = mode === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`cmp-tab${active ? ' active' : ''}`}
              onClick={() => onModeChange(key)}
            >
              <Icon size={15} className="cmp-tab-ico" />
              <span className="cmp-tab-txt">
                <span className="cmp-tab-title">{title}</span>
                <span className="cmp-tab-sub">{sub[key]}</span>
              </span>
            </button>
          )
        })}
      </div>

      {mode === 'custom' && (
        <div className="cmp-custom">
          <label className="cmp-custom-label" htmlFor="cmp-month">Bandingkan dengan</label>
          <div className="cmp-custom-ctrl">
            <button
              type="button"
              className="cmp-step"
              aria-label="Bulan yang lebih lama"
              disabled={idx < 0 || idx >= options.length - 1}
              onClick={() => step(idx + 1)}
            >
              <ChevronLeft size={16} />
            </button>

            <select
              id="cmp-month"
              className="cmp-select"
              value={keyOf(customMonth)}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number)
                onCustomChange({ month: m, year: y })
              }}
            >
              {years.map(y => (
                <optgroup key={y} label={String(y)}>
                  {options.filter(o => o.year === y).map(o => (
                    <option key={keyOf(o)} value={keyOf(o)}>{getMonthName(o.month, o.year)}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <button
              type="button"
              className="cmp-step"
              aria-label="Bulan yang lebih baru"
              disabled={idx <= 0}
              onClick={() => step(idx - 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
