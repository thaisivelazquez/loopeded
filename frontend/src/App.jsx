import { useLoopedApp } from './useLoopedApp.js';
import Onboarding from './components/Onboarding.jsx';
import NavBar from './components/NavBar.jsx';
import TodayBoard from './components/TodayBoard.jsx';
import Pings from './components/Pings.jsx';
import Friends from './components/Friends.jsx';
import Profile from './components/Profile.jsx';
import EventDetail from './components/EventDetail.jsx';
import Composer from './components/Composer.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const app = useLoopedApp();

  return (
    <div style={{ minHeight: '100vh', background: app.bgGradient, color: '#3a2c28', transition: 'background 1.2s ease' }}>
      {app.isLoading ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: .6 }}>
          loading looped…
        </div>
      ) : app.isOnboarding ? (
        <Onboarding ob={app.onboarding} accent={app.accent} />
      ) : (
        <>
          <NavBar nav={app.nav} accent={app.accent} />
          {app.view === 'today' && <TodayBoard today={app.today} accent={app.accent} />}
          {app.view === 'pings' && <Pings pings={app.pings} accent={app.accent} />}
          {app.view === 'friends' && <Friends friends={app.friends} accent={app.accent} />}
          {app.view === 'you' && <Profile profile={{ ...app.profile, goToday: app.nav.goToday }} />}
        </>
      )}

      <EventDetail detail={app.detail} />
      <Composer composer={app.composer} accent={app.accent} />
      <Toast toast={app.toast} />
    </div>
  );
}
