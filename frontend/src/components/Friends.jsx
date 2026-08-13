// ====================================================
// SAVE TO: frontend/src/components/Friends.jsx
// ====================================================
function FriendsRing({ you, friends, accent }) {
  const inner = friends.filter(f => f.circle === 'inner');
  const outer = friends.filter(f => f.circle !== 'inner');

  const place = (list, radius) => list.map((fr, i) => {
    const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
    return { ...fr, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  const innerPlaced = place(inner, 66);
  const outerPlaced = place(outer, 126);

  const size = 296;
  const center = size / 2;

  const avatarStyle = (d, bg, ring) => ({
    width: d, height: d, borderRadius: '50%', background: bg,
    display: 'grid', placeItems: 'center', color: '#fff',
    font: `800 ${d >= 44 ? 16 : 14}px Nunito,sans-serif`,
    boxShadow: '0 4px 10px rgba(0,0,0,.12)',
    border: ring ? '2.5px solid #ffd27a' : 'none',
  });

  const liveDotStyle = {
    position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderRadius: '50%',
    background: '#3ecf6a', border: '2px solid rgba(255,251,246,.95)'
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
      <div className="looped-ring-outer">
      <div className="looped-ring-inner">
        {/* guide rings */}
        <div style={{ position: 'absolute', top: center - 66, left: center - 66, width: 132, height: 132, borderRadius: '50%', border: '1px dashed rgba(58,44,40,.2)' }} />
        <div style={{ position: 'absolute', top: center - 126, left: center - 126, width: 252, height: 252, borderRadius: '50%', border: '1px dashed rgba(58,44,40,.15)' }} />

        {/* you, dead center */}
        <div style={{ position: 'absolute', top: center - 30, left: center - 30, width: 60, height: 60 }}>
          <div style={avatarStyle(60, (you && you.color) || accent, false)}>
            {you && you.avatarUrl
              ? <img src={you.avatarUrl} alt="you" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : (you ? you.initial : 'Y')}
          </div>
        </div>
        <div style={{ position: 'absolute', top: center + 34, left: center - 30, width: 60, textAlign: 'center', font: '700 11px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>you</div>

        {/* inner ring: friends you've placed in your inner circle */}
        {innerPlaced.map(fr => (
          <div key={fr.id} onClick={fr.showStatus} style={{ position: 'absolute', top: center + fr.y - 22, left: center + fr.x - 22, width: 44, textAlign: 'center', cursor: 'pointer' }} title={fr.name + " — tap to see what they're up to"}>
            <div style={{ position: 'relative' }}>
              <div style={avatarStyle(44, fr.color, true)}>
                {fr.avatarUrl
                  ? <img src={fr.avatarUrl} alt={fr.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : fr.initial}
              </div>
              {fr.live && <div style={liveDotStyle} />}
            </div>
            <div style={{ marginTop: 4, font: '700 10.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)', whiteSpace: 'nowrap' }}>
              {fr.first || fr.name}
            </div>
          </div>
        ))}

        {/* outer ring: everyone else */}
        {outerPlaced.map(fr => (
          <div key={fr.id} onClick={fr.showStatus} style={{ position: 'absolute', top: center + fr.y - 20, left: center + fr.x - 20, width: 40, textAlign: 'center', cursor: 'pointer' }} title={fr.name + " — tap to see what they're up to"}>
            <div style={{ position: 'relative' }}>
              <div style={avatarStyle(40, fr.color, false)}>
                {fr.avatarUrl
                  ? <img src={fr.avatarUrl} alt={fr.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : fr.initial}
              </div>
              {fr.live && <div style={liveDotStyle} />}
            </div>
            <div style={{ marginTop: 4, font: '600 10px Karla,sans-serif', color: 'rgba(58,44,40,.55)', whiteSpace: 'nowrap' }}>
              {fr.first || fr.name}
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 190 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #ffd27a', background: 'rgba(255,255,255,.6)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ font: '800 12.5px Nunito,sans-serif', color: '#3a2c28' }}>inner circle</div>
            <div style={{ font: '11.5px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 2 }}>your closest people</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px dashed rgba(58,44,40,.35)', background: 'rgba(255,255,255,.6)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ font: '800 12.5px Nunito,sans-serif', color: '#3a2c28' }}>outer circle</div>
            <div style={{ font: '11.5px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 2 }}>everyone else — still friends, just not as close</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ ...liveDotStyle, position: 'static', flexShrink: 0, marginTop: 3 }} />
          <div style={{ font: '11.5px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>green dot = live right now</div>
        </div>
        <div style={{ font: '11px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.5)' }}>tap anyone in the ring to see what they're up to</div>
      </div>
    </div>
  );
}

function FriendStatusCard({ status, accent }) {
  if (!status.open) return null;
  return (
    <div onClick={status.close} className="looped-modal-overlay" style={{ background: 'rgba(58,44,40,.25)', backdropFilter: 'blur(3px)', zIndex: 55 }}>
      <div onClick={(e) => e.stopPropagation()} className="looped-modal" style={{ maxWidth: 340, background: 'rgba(255,251,246,.94)', border: '1px solid rgba(255,255,255,.9)', backdropFilter: 'blur(20px)', borderRadius: 22, animation: 'loopPop .35s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={status.close} style={{ cursor: 'pointer', border: 'none', background: 'rgba(58,44,40,.08)', color: '#3a2c28', font: '800 13px Nunito,sans-serif', width: 28, height: 28, borderRadius: '50%' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -6 }}>
          <div style={{ position: 'relative', flex: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: status.color, display: 'grid', placeItems: 'center', font: '800 18px Nunito,sans-serif', color: '#fff' }}>{status.initial}</div>
            <div style={{ position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: status.live ? '#3ecf6a' : 'rgba(58,44,40,.3)', border: '2px solid rgba(255,251,246,.95)' }} />
          </div>
          <div>
            <div style={{ font: '800 17px Nunito,sans-serif' }}>{status.name}</div>
            <div style={{ font: '700 12px Karla,sans-serif', color: status.live ? '#2f9e52' : 'rgba(58,44,40,.55)', marginTop: 2 }}>
              {/* {status.live ? '🟢 live' : '⚪ offline'} */}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, background: 'rgba(58,44,40,.05)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ font: '700 15px Nunito,sans-serif', color: '#3a2c28' }}>{status.activityLine}</div>
          {status.placeLine && <div style={{ font: '600 13px Karla,sans-serif', color: 'rgba(58,44,40,.65)', marginTop: 4 }}>{status.placeLine}</div>}
        </div>

        {status.showOpenActivity && (
          <button onClick={status.openActivity} style={{ cursor: 'pointer', display: 'block', width: '100%', border: 'none', background: accent, color: '#fff', font: '800 14px Nunito,sans-serif', padding: 13, borderRadius: 999, marginTop: 16, boxShadow: '0 3px 12px rgba(255,138,92,.35)' }}>see details</button>
        )}

        <button
          onClick={status.toggleCircle}
          style={{
            cursor: 'pointer', display: 'block', width: '100%', marginTop: 10,
            border: status.circle === 'inner' ? '1.5px solid #ffd27a' : '1px dashed rgba(58,44,40,.3)',
            background: status.circle === 'inner' ? 'rgba(255,210,122,.18)' : 'rgba(255,255,255,.6)',
            color: '#3a2c28', font: '700 13px Karla,sans-serif', padding: 12, borderRadius: 999
          }}
        >
          {status.circle === 'inner' ? '💛 in your inner circle — move to outer' : 'in your outer circle — move to inner'}
        </button>

        <button
          onClick={status.removeFriend}
          style={{
            cursor: 'pointer', display: 'block', width: '100%', marginTop: 10,
            border: status.removeArmed ? '1.5px solid #e0574c' : 'none',
            background: status.removeArmed ? 'rgba(224,87,76,.1)' : 'transparent',
            color: status.removeArmed ? '#c13d33' : 'rgba(58,44,40,.45)',
            font: '700 12.5px Karla,sans-serif', padding: 10, borderRadius: 999
          }}
        >
          {status.removeArmed ? 'tap again to remove 💔' : 'remove friend'}
        </button>
      </div>
    </div>
  );
}

export default function Friends({ friends, accent }) {
  return (
    <div className="looped-page" style={{ maxWidth: 880 }}>
      <div style={{ font: '800 32px Nunito,sans-serif' }}>your people</div>
      <div style={{ font: '14px Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 5 }}>{friends.countLine}</div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
<div className="looped-invite-row">
  <div
    className="looped-invite-input"
    style={{
      display: 'flex',
      border: '1px solid rgba(58,44,40,.2)',
      background: 'rgba(255,255,255,.6)',
      borderRadius: 999,
      overflow: 'hidden'
    }}
  >
    <select
      defaultValue="+1"
      onChange={(e) => {
        const code = e.target.value;
        const current = friends.query.replace(/^\+\d+\s?/, '');

        friends.setQuery({
          target: {
            value: code + ' ' + current
          }
        });
      }}
      style={{
        border: 'none',
        background: 'rgba(255,255,255,.45)',
        padding: '0 12px',
        font: '700 13px Karla,sans-serif',
        color: '#3a2c28',
        outline: 'none'
      }}
    >
      <option value="+1">🇺🇸 +1</option>
      <option value="+44">🇬🇧 +44</option>
      <option value="+61">🇦🇺 +61</option>
      <option value="+33">🇫🇷 +33</option>
      <option value="+49">🇩🇪 +49</option>
      <option value="+81">🇯🇵 +81</option>
      <option value="+91">🇮🇳 +91</option>
    </select>

    <input
      value={friends.query}
      onChange={friends.setQuery}
      onKeyDown={friends.inviteKeyDown}
      inputMode="tel"
      placeholder="phone number…"
      style={{
        flex: 1,
        minWidth: 0,
        border: 'none',
        background: 'transparent',
        padding: '12px 14px',
        font: '600 14px Karla,sans-serif',
        color: '#3a2c28',
        outline: 'none'
      }}
    />
  </div>

  <button
    className="looped-invite-btn"
    onClick={friends.sendInvite}
    style={{
      cursor: 'pointer',
      border: 'none',
      background: accent,
      color: '#fff',
      font: '800 13.5px Nunito,sans-serif',
      padding: '12px 20px',
      borderRadius: 999
    }}
  >
    invite
  </button>
</div>
        <button
          onClick={friends.copyInviteLink}
          style={{ cursor: 'pointer', border: '1.5px dashed rgba(58,44,40,.28)', background: 'rgba(255,255,255,.4)', color: '#3a2c28', font: '700 13px Karla,sans-serif', padding: '11px 18px', borderRadius: 999, alignSelf: 'flex-start' }}
        >
          🔗 copy invite link
        </button>
        <div style={{ font: '600 12px Karla,sans-serif', color: 'rgba(58,44,40,.5)' }}>share it with friends who aren't on looped yet so they can sign up</div>
      </div>

      <FriendsRing you={friends.you} friends={friends.cards} accent={accent} />

      <FriendStatusCard status={friends.status} accent={accent} />
    </div>
  );
}