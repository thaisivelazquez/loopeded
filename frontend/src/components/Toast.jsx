export default function Toast({ toast }) {
  if (!toast.shown) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(58,44,40,.92)', color: '#fff3e8', font: '700 13.5px Karla,sans-serif',
      padding: '12px 22px', borderRadius: 999, animation: 'loopToast .3s ease', zIndex: 60
    }}>
      {toast.text}
    </div>
  );
}
