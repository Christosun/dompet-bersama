import { useState } from 'react'
import { getInitials, getAvatarColor } from '../lib/utils'

// Petakan nama depan (lowercase) ke foto di /public/avatars/
const PHOTO_MAP = {
  'eto': '/avatars/eto.jpg',
  'noni': '/avatars/noni.jpg',
}

function getPhotoUrl(name) {
  if (!name) return null
  const first = name.trim().split(' ')[0].toLowerCase()
  return PHOTO_MAP[first] || null
}

/**
 * Avatar — foto atau inisial
 *
 * Props:
 *  name           string   — nama pengguna
 *  size           number   — diameter px (default 36)
 *  ring           bool     — border cincin emas + glow on hover
 *  status         bool     — titik hijau "online" dengan animasi pulse
 *  tooltip        bool     — tooltip nama saat hover
 *  objectPos      string   — posisi crop foto (default 'center 15%')
 *  style          object   — tambahan inline style pada wrapper
 *  className      string   — class tambahan pada wrapper
 */
export default function Avatar({
  name,
  size = 36,
  ring = false,
  status = false,
  tooltip = false,
  objectPos = 'center 15%',
  style = {},
  className = '',
}) {
  const [imgError, setImgError] = useState(false)
  const photoUrl = getPhotoUrl(name)
  const hasPhoto = photoUrl && !imgError
  const fs = Math.max(7, Math.round(size * 0.36))

  const classes = [
    'av-root',
    ring ? 'av-ring' : '',
    tooltip ? 'av-tip' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      data-label={name?.split(' ')[0]}
      style={{ width: size, height: size, ...style }}
    >
      <div
        className="av-circle"
        style={{ background: hasPhoto ? undefined : getAvatarColor(name) }}
      >
        {hasPhoto ? (
          <img
            src={photoUrl}
            alt={name}
            onError={() => setImgError(true)}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objectPos, display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: fs, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {getInitials(name)}
          </span>
        )}
      </div>

      {status && <span className="av-status" />}
    </div>
  )
}
