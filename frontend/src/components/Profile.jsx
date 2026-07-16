export default function Profile({ profile }) {
  return (
    <div style={{ padding: '18px 44px 60px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ffb37e', display: 'grid', placeItems: 'center', font: '800 28px Nunito,sans-serif', color: '#fff' }}>{profile.yourInitial}</div>
        <div>
          <div style={{ font: '800 28px Nunito,sans-serif' }}>{profile.name}</div>
          <div style={{ font: '13px Karla,sans-serif', color: 'rgba(58,44,40,.55)' }}>{profile.phone}</div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ font: '700 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>your bio</label>
        <input
          value={profile.bio} onChange={profile.setBio} placeholder="add a short bio — what are you usually up for?"
          style={{ border: '1px solid rgba(58,44,40,.2)', background: 'rgba(255,255,255,.6)', borderRadius: 12, padding: '12px 15px', font: '600 14px Karla,sans-serif', color: '#3a2c28' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 26, marginTop: 22, font: '13px Karla,sans-serif', color: 'rgba(58,44,40,.6)' }}>
        <div><span style={{ font: '800 18px Nunito,sans-serif', color: '#3a2c28' }}>{profile.statPosted}</span> posted</div>
        <div><span style={{ font: '800 18px Nunito,sans-serif', color: '#3a2c28' }}>{profile.statJoined}</span> joined</div>
        <div><span style={{ font: '800 18px Nunito,sans-serif', color: '#3a2c28' }}>{profile.statFriends}</span> friends</div>
      </div>

      <div style={{ marginTop: 30, font: '800 17px Nunito,sans-serif' }}>going to</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
        {profile.goingEvents.map(ev => (
          <div key={ev.id} onClick={ev.open} className="looped-card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '13px 16px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: ev.color, display: 'grid', placeItems: 'center', font: '800 13px Nunito,sans-serif', color: '#fff', flex: 'none' }}>{ev.initial}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <div style={{ font: '800 14.5px Nunito,sans-serif' }}>{ev.title}</div>
              <div style={{ font: '12px Karla,sans-serif', color: 'rgba(58,44,40,.55)' }}>{ev.meta}</div>
            </div>
            <div style={{ marginLeft: 'auto', background: '#3a2c28', color: '#ffe9c2', font: '800 11px Nunito,sans-serif', padding: '6px 12px', borderRadius: 999, flex: 'none' }}>going ✓</div>
          </div>
        ))}
        {profile.noGoing && (
          <div style={{ border: '1.5px dashed rgba(58,44,40,.18)', borderRadius: 16, padding: 20, textAlign: 'center', font: '600 13px Karla,sans-serif', color: 'rgba(58,44,40,.45)' }}>
            not going to anything yet — <span onClick={profile.goToday} style={{ textDecoration: 'underline', cursor: 'pointer', color: '#3a2c28' }}>check the board</span> 🌤️
          </div>
        )}
      </div>

      <div style={{ marginTop: 30, font: '800 17px Nunito,sans-serif' }}>you're hosting</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
        {profile.yourPosts.map(post => (
          <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '13px 16px' }}>
            <div onClick={post.open} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <div style={{ font: '800 14.5px Nunito,sans-serif' }}>{post.title}</div>
              <div style={{ font: '12px Karla,sans-serif', color: 'rgba(58,44,40,.55)' }}>{post.meta}</div>
            </div>
            <button onClick={post.cancel} style={{ marginLeft: 'auto', cursor: 'pointer', border: '1.5px solid rgba(58,44,40,.25)', background: 'none', color: 'rgba(58,44,40,.65)', font: '800 11.5px Nunito,sans-serif', padding: '7px 13px', borderRadius: 999, flex: 'none' }}>call it off</button>
          </div>
        ))}
        {profile.noPosts && (
          <div style={{ border: '1.5px dashed rgba(58,44,40,.18)', borderRadius: 16, padding: 20, textAlign: 'center', font: '600 13px Karla,sans-serif', color: 'rgba(58,44,40,.45)' }}>
            nothing on the board yet — <span onClick={profile.openComposerFromYou} style={{ textDecoration: 'underline', cursor: 'pointer', color: '#3a2c28' }}>post something</span> ✨
          </div>
        )}
      </div>

      <div style={{ marginTop: 30, font: '800 17px Nunito,sans-serif' }}>the sky</div>
      <div style={{ font: '13px Karla,sans-serif', color: 'rgba(58,44,40,.6)', marginTop: 4 }}>looped's background follows the real time of day. peek at the other skies:</div>
      <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
        {profile.skyChips.map(chip => (
          <button key={chip.key} onClick={chip.pick} style={{ cursor: 'pointer', border: '1.5px solid ' + chip.border, background: chip.bg, color: '#3a2c28', font: '700 12.5px Karla,sans-serif', padding: '9px 15px', borderRadius: 999 }}>{chip.label}</button>
        ))}
      </div>

      <div style={{ marginTop: 30 }}>
        <button onClick={profile.resetApp} style={{ cursor: 'pointer', border: 'none', background: 'none', font: '600 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.45)', textDecoration: 'underline', padding: 0 }}>start over (replay onboarding)</button>
      </div>
    </div>
  );
}
