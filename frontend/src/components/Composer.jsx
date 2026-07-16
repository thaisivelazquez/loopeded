const ARROW_BG = "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M1 1l4 4 4-4%22 stroke=%22%233a2c28%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')";

const selectStyle = {
  appearance: 'none',
  border: '1px solid rgba(58,44,40,.2)',
  background: `#fff ${ARROW_BG} no-repeat right 16px center`,
  borderRadius: 12,
  padding: '12px 42px 12px 14px',
  font: '600 14px Karla,sans-serif',
  color: '#3a2c28'
};

const textInputStyle = {
  border: '1px solid rgba(58,44,40,.2)', background: '#fff', borderRadius: 12,
  padding: '12px 15px', font: '600 14px Karla,sans-serif', color: '#3a2c28'
};

export default function Composer({ composer, accent }) {
  if (!composer.open) return null;
  return (
    <div onClick={composer.close} className="looped-modal-overlay" style={{ background: 'rgba(58,44,40,.25)', backdropFilter: 'blur(3px)', zIndex: 55 }}>
      <div onClick={(e) => e.stopPropagation()} className="looped-modal" style={{ background: 'rgba(255,251,246,.92)', border: '1px solid rgba(255,255,255,.9)', backdropFilter: 'blur(20px)', borderRadius: 22, animation: 'loopPop .35s ease' }}>
        <div style={{ font: '800 21px Nunito,sans-serif' }}>what are you up to?</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'nowrap' }}>
          {composer.emojiChips.map((em, i) => (
            <button key={i} onClick={em.pick} style={{ flex: 1, minWidth: 0, cursor: 'pointer', border: '1.5px solid ' + em.border, background: em.bg, fontSize: 16, padding: '7px 0', borderRadius: 10 }}>{em.char}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <input value={composer.cTitle} onChange={composer.setCTitle} placeholder="grabbing boba, pickup soccer, library grind…" style={textInputStyle} />
          <input value={composer.cPlace} onChange={composer.setCPlace} placeholder="where?" style={textInputStyle} />
          <input value={composer.cNote} onChange={composer.setCNote} placeholder="leave a note for friends (optional)" style={textInputStyle} />
          <select value={composer.cDate} onChange={composer.setCDate} style={selectStyle}>
            {composer.dateOptions.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={composer.cTime} onChange={composer.setCTime} style={{ ...selectStyle, flex: 1 }}>
              {composer.timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={composer.cSpots} onChange={composer.setCSpots} style={{ ...selectStyle, flex: 1 }}>
              {composer.spotsOptions.map(sp => <option key={sp.value} value={sp.value}>{sp.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={composer.postActivity} style={{ cursor: 'pointer', border: 'none', background: accent, color: '#fff', font: '800 14px Nunito,sans-serif', padding: '13px 22px', borderRadius: 999, boxShadow: '0 3px 12px rgba(255,138,92,.4)' }}>post it</button>
          <button onClick={composer.close} style={{ cursor: 'pointer', border: 'none', background: 'rgba(58,44,40,.08)', color: '#3a2c28', font: '800 14px Nunito,sans-serif', padding: '13px 20px', borderRadius: 999 }}>never mind</button>
        </div>
      </div>
    </div>
  );
}