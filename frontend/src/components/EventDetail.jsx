export default function EventDetail({ detail }) {
  if (!detail.open) return null;
  return (
    <div
      onClick={detail.close}
      className="looped-modal-overlay"
      style={{ background: 'rgba(58,44,40,.28)', backdropFilter: 'blur(3px)', zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="looped-modal"
        style={{
          maxHeight: '86vh', overflowY: 'auto',
          background: 'rgba(255,251,246,.94)', border: '1px solid rgba(255,255,255,.9)', backdropFilter: 'blur(20px)',
          borderRadius: 22, animation: 'loopPop .35s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-8px -10px 4px 0' }}>
          <button onClick={detail.close} style={{ cursor: 'pointer', border: 'none', background: 'rgba(58,44,40,.08)', color: '#3a2c28', font: '800 13px Nunito,sans-serif', width: 28, height: 28, borderRadius: '50%' }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: detail.color, display: 'grid', placeItems: 'center', font: '800 17px Nunito,sans-serif', color: '#fff', flex: 'none' }}>{detail.initial}</div>
          <div>
            <div style={{ font: '800 15px Nunito,sans-serif' }}>{detail.who}</div>
            <div style={{ font: '12px Karla,sans-serif', color: 'rgba(58,44,40,.55)' }}>{detail.postedAgo}</div>
          </div>
        </div>

        <div style={{ font: '800 26px/1.2 Nunito,sans-serif', margin: '14px 0 4px' }}>{detail.title}</div>

        {detail.hasNote && (
          <>
            <div style={{ font: '700 11px Karla,sans-serif', letterSpacing: '.08em', color: 'rgba(58,44,40,.5)', marginTop: 12 }}>A WORD FROM {detail.whoUpper}</div>
            <div style={{ font: 'italic 400 15px/1.5 Karla,sans-serif', color: '#3a2c28', marginTop: 5 }}>"{detail.note}"</div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 16, font: '600 13.5px Karla,sans-serif', color: '#3a2c28' }}>
          <div>📍 {detail.place}</div>
          <div>🕒 {detail.timeRange}</div>
        </div>

        <div style={{ borderTop: '1px solid rgba(58,44,40,.15)', margin: '18px 0 14px' }} />

        <div style={{ font: '700 11px Karla,sans-serif', letterSpacing: '.08em', color: 'rgba(58,44,40,.5)' }}>WHO'S GOING</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
          <div style={{ display: 'flex' }}>
            {detail.avatars.map((av, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: av.color, border: '2px solid rgba(255,251,246,.95)', marginLeft: av.ml, display: 'grid', placeItems: 'center', font: '800 11px Nunito,sans-serif', color: '#fff' }}>{av.initial}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ font: '600 13px Karla,sans-serif' }}>{detail.goingNames}</div>
            <div style={{ font: 'italic 600 12px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>{detail.spotsLine}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(58,44,40,.15)', margin: '16px 0 14px' }} />

        <div style={{ font: '700 11px Karla,sans-serif', letterSpacing: '.08em', color: 'rgba(58,44,40,.5)' }}>GETTING THERE</div>
        <div style={{ marginTop: 9, height: 110, borderRadius: 14, background: 'rgba(58,44,40,.08)', display: 'grid', placeItems: 'center', font: '600 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.45)' }}>map preview 🗺️</div>
        <div style={{ textAlign: 'center', font: '600 12px Karla,sans-serif', color: 'rgba(58,44,40,.55)', marginTop: 7 }}>{detail.distance}</div>

        {detail.showJoin && (
          <>
            <button onClick={detail.toggleJoin} style={{ cursor: 'pointer', border: 'none', display: 'block', width: '100%', background: detail.btnBg, color: detail.btnColor, font: '800 16px Nunito,sans-serif', padding: 15, borderRadius: 999, marginTop: 20, boxShadow: '0 3px 12px rgba(255,138,92,.35)' }}>{detail.btnLabel}</button>
            <div style={{ textAlign: 'center', font: '600 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 12 }}>
              <span onClick={detail.cantMake} style={{ textDecoration: 'underline', cursor: 'pointer', color: '#3a2c28', fontWeight: 700 }}>tell {detail.who} you can't make it this time :(</span>
            </div>
          </>
        )}
        {detail.isYours && (
          <button onClick={detail.cancel} style={{ cursor: 'pointer', display: 'block', width: '100%', border: '1.5px solid rgba(58,44,40,.25)', background: 'none', color: 'rgba(58,44,40,.7)', font: '800 15px Nunito,sans-serif', padding: 14, borderRadius: 999, marginTop: 20 }}>call it off</button>
        )}
      </div>
    </div>
  );
}