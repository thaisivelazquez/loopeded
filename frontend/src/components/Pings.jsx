// ====================================================
// SAVE TO: frontend/src/components/Pings.jsx
// ====================================================
export default function Pings({ pings, accent }) {
  return (
    <div className="looped-page" style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <div style={{ font: '800 32px Nunito,sans-serif' }}>pings</div>
        <button onClick={pings.markAllRead} style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none', background: 'none', font: '700 13px Karla,sans-serif', color: 'rgba(58,44,40,.55)', textDecoration: 'underline' }}>mark all read</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 20 }}>
        {pings.list.map(ping => (
          <div key={ping.key} style={{ display: 'flex', alignItems: 'center', gap: 13, background: ping.bg, border: '1px solid rgba(255,255,255,.75)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: ping.color, display: 'grid', placeItems: 'center', font: '800 13px Nunito,sans-serif', color: '#fff', flex: 'none' }}>{ping.initial}</div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ font: '600 13.5px/1.4 Karla,sans-serif' }}>{ping.text}</div>
              <div style={{ font: '11.5px Karla,sans-serif', color: 'rgba(58,44,40,.5)' }}>{ping.when}</div>
            </div>
            {ping.isFriendRequest && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flex: 'none' }}>
                <button onClick={ping.decline} style={{ cursor: 'pointer', border: 'none', background: 'rgba(58,44,40,.08)', color: 'rgba(58,44,40,.7)', font: '800 11.5px Nunito,sans-serif', padding: '8px 14px', borderRadius: 999 }}>decline</button>
                <button onClick={ping.accept} style={{ cursor: 'pointer', border: 'none', background: accent, color: '#fff', font: '800 11.5px Nunito,sans-serif', padding: '8px 14px', borderRadius: 999 }}>accept</button>
              </div>
            )}
            {ping.hasAction && (
              <button onClick={ping.act} style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none', background: accent, color: '#fff', font: '800 11.5px Nunito,sans-serif', padding: '8px 14px', borderRadius: 999, flex: 'none' }}>{ping.actionLabel}</button>
            )}
            {ping.going && (
              <div style={{ marginLeft: ping.hasAction ? 0 : 'auto', background: '#3a2c28', color: '#ffe9c2', font: '800 11.5px Nunito,sans-serif', padding: '8px 14px', borderRadius: 999, flex: 'none' }}>going ✓</div>
            )}
            <button
              onClick={ping.del}
              title="delete notification"
              style={{ marginLeft: (ping.hasAction || ping.going || ping.isFriendRequest) ? 4 : 'auto', cursor: 'pointer', border: 'none', background: 'rgba(58,44,40,.08)', color: 'rgba(58,44,40,.6)', font: '800 12px Nunito,sans-serif', width: 26, height: 26, borderRadius: '50%', flex: 'none' }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}