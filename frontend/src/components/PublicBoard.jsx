// ====================================================
// SAVE TO: frontend/src/components/PublicBoard.jsx
// ====================================================
export default function PublicBoard({ pub, accent }) {
  return (
    <div className="looped-page" style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ font: '800 32px Nunito,sans-serif' }}>public</div>
        <div style={{ font: '13px Karla,sans-serif', color: 'rgba(58,44,40,.5)' }}>open to everyone on looped</div>
      </div>

      <button
        onClick={pub.openComposer}
        style={{
          marginTop: 20, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
          background: accent, color: '#fff', borderRadius: 999, padding: '14px 22px',
          font: '800 14.5px Nunito,sans-serif', boxShadow: '0 3px 12px rgba(255,138,92,.4)'
        }}
      >
        🌍 post a public event
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
        {pub.list.length === 0 && (
          <div style={{ border: '1.5px dashed rgba(58,44,40,.18)', borderRadius: 16, padding: 24, textAlign: 'center', font: '600 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.45)' }}>
            nothing public posted yet — be the first 🌿
          </div>
        )}
        {pub.list.map(ev => (
          <div key={ev.id} onClick={ev.open} className="looped-card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: ev.color, display: 'grid', placeItems: 'center', font: '800 15px Nunito,sans-serif', color: '#fff', flex: 'none' }}>{ev.initial}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <div style={{ font: '800 15px Nunito,sans-serif' }}>{ev.title}</div>
              <div style={{ font: '12.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>{ev.meta}</div>
              {ev.note && (
                <div style={{ font: 'italic 400 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{ev.note}"</div>
              )}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
              {ev.isYours ? (
                <>
                  <div style={{ background: 'rgba(58,44,40,.1)', font: '700 10px Karla,sans-serif', padding: '3px 8px', borderRadius: 999, color: 'rgba(58,44,40,.65)' }}>yours</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); ev.cancel(); }}
                    style={{ cursor: 'pointer', border: '1.5px solid rgba(58,44,40,.25)', background: 'none', color: 'rgba(58,44,40,.65)', font: '800 11px Nunito,sans-serif', padding: '6px 12px', borderRadius: 999, flex: 'none' }}
                  >call it off</button>
                </>
              ) : ev.showJoin ? (
                <button
                  onClick={(e) => { e.stopPropagation(); ev.toggleJoin(); }}
                  style={{ cursor: 'pointer', border: 'none', background: ev.going ? '#3a2c28' : accent, color: ev.going ? '#ffe9c2' : '#fff', font: '800 11px Nunito,sans-serif', padding: '7px 13px', borderRadius: 999, flex: 'none' }}
                >{ev.btnLabel}</button>
              ) : (
                <div style={{ font: '600 12px Karla,sans-serif', color: 'rgba(58,44,40,.5)' }}>{ev.btnLabel}</div>
              )}
              <div style={{ font: '800 15px Nunito,sans-serif', color: 'rgba(58,44,40,.35)' }}>›</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}