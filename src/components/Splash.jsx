export default function Splash({ leaving }) {
  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="splash-content">
        <div className="splash-logo">Dompet Bersama</div>
        <div className="splash-names">Eto &amp; Noni</div>
        <div className="splash-bar"><span /></div>
      </div>
    </div>
  )
}