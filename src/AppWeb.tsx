// src/AppWeb.tsx
import React, { useState, useEffect } from 'react';
import { useUserStore } from './services/state/userStore';
import { authService } from './services/auth/AuthService';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import MatchesScreen from './screens/MatchesScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';

type Route = 'login' | 'onboarding' | 'discovery' | 'map' | 'matches' | 'profile' | 'chat';
const NAV_TABS: Route[] = ['discovery', 'map', 'matches', 'profile'];

export default function AppWeb() {
  const { isAuthed } = useUserStore();
  const [route, setRoute] = useState<Route>(isAuthed ? 'discovery' : 'login');
  const [chatWith, setChatWith] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await authService.getSession();
      if (session) {
        const p = await authService.getOrCreateProfile(session.userId, session.phone);
        if (p) useUserStore.setState({ profile: p, isAuthed: true });
        setRoute('discovery');
      }
    };
    load();
  }, []);

  const nav = {
    toOnboarding: () => setRoute('onboarding'),
    toDiscovery:  () => setRoute('discovery'),
    toMap:        () => setRoute('map'),
    toMatches:    () => setRoute('matches'),
    toProfile:    () => setRoute('profile'),
    toLogin:      () => setRoute('login'),
    toChat: (id: string, name: string) => { setChatWith({ id, name }); setRoute('chat'); },
  };

  if (!isAuthed) {
    if (route === 'onboarding') return <OnboardingScreen onComplete={nav.toDiscovery} />;
    return <LoginScreen onGetStarted={nav.toOnboarding} onRegister={nav.toOnboarding} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#04040a' }}>
      <nav style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#04040a' }}>
        {NAV_TABS.map((r) => (
          <button key={r} onClick={() => setRoute(r)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: route === r ? '#a855f7' : 'transparent', color: route === r ? '#fff' : 'rgba(240,238,232,0.5)', fontSize: 14, fontWeight: 600 }}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {route === 'discovery' && <DiscoveryScreen />}
        {route === 'map'       && <MapScreen />}
        {route === 'matches'   && <MatchesScreen onSelectChat={nav.toChat} />}
        {route === 'profile'   && <ProfileScreen />}
        {route === 'chat' && chatWith && <ChatScreen userId={chatWith.id} displayName={chatWith.name} onBack={nav.toMatches} />}
      </div>
    </div>
  );
}
