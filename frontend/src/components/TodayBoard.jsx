export default function TodayBoard({ today, accent }) {
  return (
    <div style={{ padding: '18px 44px 60px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ font: '800 32px/1.2 Nunito,sans-serif', letterSpacing: '-.01em' }}>{today.greeting}</div>
      <div style={{ font: '15px Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 6 }}>{today.subline}</div>

      {/* timeline axis */}
      <div style={{ marginTop: 26, display: 'flex', font: '600 11px Karla,sans-serif', letterSpacing: '.06em', color: 'rgba(58,44,40,.5)' }}>
        {today.axis.map((seg, i) => (
          <div key={i} style={{ flex: 1, borderTop: seg.borderTop, position: 'relative', paddingTop: 7 }}>
            <span style={{ color: seg.color }}>{seg.label}</span>
          </div>
        ))}
      </div>

      {/* board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginTop: 20, alignItems: 'start' }}>
        {today.buckets.map((col, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 120 }}>
            {col.items.map(item => (
              <div
                key={item.id}
                onClick={item.open}
                className="looped-card"
                style={{
                  cursor: 'pointer', background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)',
                  backdropFilter: 'blur(12px)', borderRadius: 16, padding: '15px 16px', opacity: item.opacity,
                  animation: item.pulsing ? 'loopPulse 2.6s ease infinite' : 'none',
                  boxShadow: item.pulsing ? '0 4px 16px rgba(255,138,92,.25)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ font: (item.statusBold ? '800 11px Nunito,sans-serif' : '600 11px Karla,sans-serif'), letterSpacing: '.05em', color: item.statusColor }}>{item.statusLine}</div>
                  {item.isYours && <div style={{ marginLeft: 'auto', background: 'rgba(58,44,40,.1)', font: '700 10px Karla,sans-serif', padding: '3px 8px', borderRadius: 999, color: 'rgba(58,44,40,.65)' }}>yours</div>}
                </div>
                <div style={{ font: '800 16px Nunito,sans-serif', margin: '5px 0 2px' }}>{item.title}</div>
                <div style={{ font: '12.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>{item.whoLine}</div>
                {item.hasNote && (
                  <div style={{ font: 'italic 400 12.5px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.65)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.note}"</div>
                )}
                {item.showFooter && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex' }}>
                      {item.avatars.map((av, i) => (
                        <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: av.color, border: '2px solid rgba(255,255,255,.9)', marginLeft: av.ml }} />
                      ))}
                    </div>
                    <div style={{ font: '11.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>{item.joinText}</div>
                    {item.showBtn && (
                      <button onClick={item.toggleJoin} style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none', background: item.btnBg, color: item.btnColor, font: '800 11px Nunito,sans-serif', padding: '7px 13px', borderRadius: 999, flex: 'none' }}>{item.btnLabel}</button>
                    )}
                    {item.showCancel && (
                      <button onClick={item.cancel} style={{ marginLeft: 'auto', cursor: 'pointer', border: '1.5px solid rgba(58,44,40,.25)', background: 'none', color: 'rgba(58,44,40,.65)', font: '800 11px Nunito,sans-serif', padding: '6px 12px', borderRadius: 999, flex: 'none' }}>call it off</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {col.empty && (
              <div style={{ border: '1.5px dashed rgba(58,44,40,.18)', borderRadius: 16, padding: 18, textAlign: 'center', font: '600 12px Karla,sans-serif', color: 'rgba(58,44,40,.4)' }}>quiet for now 🌿</div>
            )}
          </div>
        ))}
      </div>

      <button onClick={today.openComposer} style={{ marginTop: 26, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, background: accent, color: '#fff', borderRadius: 999, padding: '14px 22px', font: '800 14.5px Nunito,sans-serif', boxShadow: '0 3px 12px rgba(255,138,92,.4)' }}>+ add yours to the board</button>

      {/* later this week */}
      <div style={{ marginTop: 44, font: '800 20px Nunito,sans-serif' }}>later this week</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, maxWidth: 720 }}>
        {today.weekItems.map(wk => (
          <div key={wk.id} onClick={wk.open} className="looped-card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: wk.color, display: 'grid', placeItems: 'center', font: '800 15px Nunito,sans-serif', color: '#fff', flex: 'none' }}>{wk.initial}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={{ font: '800 15px Nunito,sans-serif' }}>{wk.title}</div>
              <div style={{ font: '12.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>{wk.meta}</div>
              <div style={{ font: 'italic 400 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{wk.note}"</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
              <div style={{ font: '600 12px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>{wk.goingText}</div>
              <div style={{ font: '800 15px Nunito,sans-serif', color: 'rgba(58,44,40,.35)' }}>›</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
