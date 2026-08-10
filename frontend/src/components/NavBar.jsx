export default function NavBar({ nav, accent }) {
  return (
    <div className="looped-navbar">
      <div className="looped-navbar-logo" style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, letterSpacing: '-.02em', cursor: 'pointer', flex: 'none' }} onClick={nav.goToday}>looped</div>
      <div className="looped-navbar-tabs">
        {nav.tabs.map(tab => (
          <button
            key={tab.key}
            onClick={tab.go}
            style={{
              cursor: 'pointer', border: 'none', background: 'none', padding: '4px 2px',
              font: (tab.active ? '700' : '600') + ' 14px Karla,sans-serif',
              color: tab.active ? '#3a2c28' : 'rgba(58,44,40,.55)',
              borderBottom: '2px solid ' + (tab.active ? '#3a2c28' : 'transparent'),
              display: 'flex', alignItems: 'center', gap: 5, flex: 'none', whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
            {tab.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'inline-block' }} />}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, flex: 'none' }}>
        <div className="looped-navbar-clock" style={{ font: '600 13px Karla,sans-serif', color: 'rgba(58,44,40,.55)', whiteSpace: 'nowrap' }}>{nav.clockLine}</div>
        <div onClick={nav.goYou} style={{ width: 34, height: 34, borderRadius: '50%', background: '#ffb37e', display: 'grid', placeItems: 'center', font: '800 13px Nunito,sans-serif', color: '#fff', cursor: 'pointer', flex: 'none' }}>{nav.yourInitial}</div>
      </div>
    </div>
  );
}