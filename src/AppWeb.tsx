// src/AppWeb.tsx
// Web-only entry point — map native screens to web components
import React, { useState, useEffect } from 'react';
import { useUserStore } from './services/state/userStore';
import { authService } from './services/auth/AuthService';

// Screens — web versions (no React Native deps)
import LoginScreen from './screens/LoginScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import MatchesScreen from './screens/MatchesScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';

type Route = 'login' | 'discovery' | 'map' | 'matches' | 'profile' | 'chat';

export default function AppWeb() {
  const { profile, isAuthed } = useUserStore();
  const [route, setRoute] = useState<Route>(isAuthed ? 'discovery' : 'login');
  const [chatWith, setChatWith] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await authService.getSession();
      if (session) {
        const p = await authService.getOrCreateProfile(session.userId, session.phone);
        if (p) useUserStore.setState({ profile: p, isAuthed: true });
      }
    };
    load();
  }, []);

  const nav = {
    toDiscovery: () => setRoute('discovery'),
    toMap: () => setRoute('map'),
    toMatches: () => setRoute('matches'),
    toProfile: () => setRoute('profile'),
    toChat: (id: string, name: string) => { setChatWith({ id, name }); setRoute('chat'); },
    toLogin: () => setRoute('login'),
  };

  if (!isAuthed) return <LoginScreen onSuccess={() => nav.toDiscovery()} />;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', gap: 12, paddingX: 16, paddingY: 12, borderBottomWidth: 1, borderBottomColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        {['discovery', 'map', 'matches', 'profile'].map((r) => (
          <button
            key={r}
            onClick={() => setRoute(r as Route)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: route === r ? 'var(--purple)' : 'transparent',
              color: route === r ? '#fff' : 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </nav>

      {/* Screen */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {route === 'discovery' && <DiscoveryScreen />}
        {route === 'map' && <MapScreen />}
        {route === 'matches' && <MatchesScreen onSelectChat={nav.toChat} />}
        {route === 'profile' && <ProfileScreen />}
        {route === 'chat' && chatWith && <ChatScreen userId={chatWith.id} displayName={chatWith.name} onBack={() => nav.toMatches()} />}
      </div>
    </div>
  );
}
