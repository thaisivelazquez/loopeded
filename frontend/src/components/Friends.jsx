function FriendsRing({ you, friends, accent }) {
  const inner = friends.filter(f => f.attendingSoon);
  const outer = friends.filter(f => !f.attendingSoon);

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

 

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '28px 0 6px' }}>
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

        {/* inner ring: attending something in the next hour */}
        {innerPlaced.map(fr => (
          <div key={fr.id} style={{ position: 'absolute', top: center + fr.y - 22, left: center + fr.x - 22, width: 44, textAlign: 'center' }}>
            <div style={avatarStyle(44, fr.color, true)}>
              {fr.avatarUrl
                ? <img src={fr.avatarUrl} alt={fr.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : fr.initial}
            </div>
            <div style={{ marginTop: 4, font: '700 10.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)', whiteSpace: 'nowrap' }}>
              {(fr.name || '').split(' ')[0]}
            </div>
          </div>
        ))}

        {/* outer ring: no plans in the next hour */}
        {outerPlaced.map(fr => (
          <div key={fr.id} style={{ position: 'absolute', top: center + fr.y - 20, left: center + fr.x - 20, width: 40, textAlign: 'center' }}>
            <div style={avatarStyle(40, fr.color, false)}>
              {fr.avatarUrl
                ? <img src={fr.avatarUrl} alt={fr.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : fr.initial}
            </div>
            <div style={{ marginTop: 4, font: '600 10px Karla,sans-serif', color: 'rgba(58,44,40,.55)', whiteSpace: 'nowrap' }}>
              {(fr.name || '').split(' ')[0]}
            </div>
          </div>
        ))}
      </div>

      {/* legend explaining inner vs outer ring */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 180 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #ffd27a', background: 'rgba(255,255,255,.6)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ font: '800 12.5px Nunito,sans-serif', color: '#3a2c28' }}>inner ring</div>
            <div style={{ font: '11.5px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 2 }}>out or about to be — something on their calendar in the next hour</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px dashed rgba(58,44,40,.35)', background: 'rgba(255,255,255,.6)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ font: '800 12.5px Nunito,sans-serif', color: '#3a2c28' }}>outer ring</div>
            <div style={{ font: '11.5px/1.4 Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 2 }}>free right now — no plans in the next hour</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Friends({ friends, accent }) {
  return (
    <div style={{ padding: '18px 44px 60px', maxWidth: 880, margin: '0 auto' }}>
      <div style={{ font: '800 32px Nunito,sans-serif' }}>your people</div>
      <div style={{ font: '14px Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 5 }}>{friends.countLine}</div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={friends.query} onChange={friends.setQuery} onKeyDown={friends.inviteKeyDown}
            inputMode="tel" placeholder="add a friend by phone number…"
            style={{ flex: 1, border: '1px solid rgba(58,44,40,.2)', background: 'rgba(255,255,255,.6)', borderRadius: 999, padding: '12px 18px', font: '600 14px Karla,sans-serif', color: '#3a2c28' }}
          />
          <button onClick={friends.sendInvite} style={{ cursor: 'pointer', border: 'none', background: accent, color: '#fff', font: '800 13.5px Nunito,sans-serif', padding: '12px 20px', borderRadius: 999 }}>invite</button>
        </div>
        {friends.contactsLinked ? (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={friends.contactQuery} onChange={friends.setContactQuery} onKeyDown={friends.searchKeyDown}
                placeholder="search your contacts by name…"
                style={{ flex: 1, border: '1px solid rgba(58,44,40,.2)', background: 'rgba(255,255,255,.6)', borderRadius: 999, padding: '12px 18px', font: '600 14px Karla,sans-serif', color: '#3a2c28' }}
              />
              <button onClick={friends.searchContacts} style={{ cursor: 'pointer', border: '1.5px solid rgba(58,44,40,.25)', background: 'none', color: '#3a2c28', font: '800 13.5px Nunito,sans-serif', padding: '12px 20px', borderRadius: 999 }}>search</button>
            </div>
            <div style={{ font: '600 12px Karla,sans-serif', color: 'rgba(58,44,40,.5)' }}>📇 contacts linked — search by name is on</div>
          </>
        ) : (
          <button onClick={friends.linkContacts} style={{ cursor: 'pointer', border: '1.5px dashed rgba(58,44,40,.28)', background: 'rgba(255,255,255,.4)', color: '#3a2c28', font: '700 13px Karla,sans-serif', padding: '11px 18px', borderRadius: 999, alignSelf: 'flex-start' }}>📇 link contacts to search friends by name</button>
        )}
      </div>

      <FriendsRing you={friends.you} friends={friends.cards} accent={accent} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13, marginTop: 22 }}>
        {friends.cards.map(fr => (
          <div key={fr.id} style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '17px 17px 15px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: fr.color, display: 'grid', placeItems: 'center', font: '800 17px Nunito,sans-serif', color: '#fff', marginBottom: 7 }}>{fr.initial}</div>
            <div style={{ font: '800 15.5px Nunito,sans-serif' }}>{fr.name}</div>
            <div style={{ font: '12.5px/1.45 Karla,sans-serif', color: 'rgba(58,44,40,.65)', marginTop: 4 }}>{fr.bio}</div>
          </div>
        ))}
      </div>
    </div>
  );
}