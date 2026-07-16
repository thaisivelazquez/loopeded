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
