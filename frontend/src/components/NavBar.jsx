export default function NavBar({ nav, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '20px 44px 8px' }}>
      <div style={{ font: '900 24px Nunito,sans-serif', letterSpacing: '-.02em', cursor: 'pointer' }} onClick={nav.goToday}>looped</div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {nav.tabs.map(tab => (
          <button
            key={tab.key}
            onClick={tab.go}
            style={{
              cursor: 'pointer', border: 'none', background: 'none', padding: '4px 2px',
              font: (tab.active ? '700' : '600') + ' 14px Karla,sans-serif',
              color: tab.active ? '#3a2c28' : 'rgba(58,44,40,.55)',
              borderBottom: '2px solid ' + (tab.active ? '#3a2c28' : 'transparent'),
              display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            {tab.label}
            {tab.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'inline-block' }} />}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ font: '600 13px Karla,sans-serif', color: 'rgba(58,44,40,.55)' }}>{nav.clockLine}</div>
        <div onClick={nav.goYou} style={{ width: 34, height: 34, borderRadius: '50%', background: '#ffb37e', display: 'grid', placeItems: 'center', font: '800 13px Nunito,sans-serif', color: '#fff', cursor: 'pointer' }}>{nav.yourInitial}</div>
      </div>
    </div>
  );
}
