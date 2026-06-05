// src/screens/MatchesScreen.tsx — Pure web, Supabase Realtime
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../config/supabase';

const C = {
  bg: '#04040a', surface: '#0d0d14', card: '#111118', border: 'rgba(168,85,247,0.15)',
  purple: '#a855f7', pink: '#ec4899', amber: '#fbbf24', green: '#4ade80', red: '#f43f5e',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)', textMid: 'rgba(240,238,232,0.7)',
};

interface MatchItem {
  matchId: string; conversationId: string | null; userId: string;
  displayName: string; avatarUrl: string; tagline: string;
  lastMessage: string; lastMessageAt: string; isOnline: boolean;
  unread: number;
}

interface Props { onOpenChat: (userId: string, name: string, conversationId: string) => void; }

const MatchesScreen: React.FC<Props> = ({ onOpenChat }) => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState('');

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    if (!isSupabaseReady) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    // Get matches where user is participant
    const { data: matchRows } = await supabase
      .from('matches')
      .select('id, user_a, user_b, matched_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq('is_active', true)
      .order('matched_at', { ascending: false });

    if (!matchRows?.length) { setLoading(false); return; }

    // Get other user IDs
    const otherIds = matchRows.map(m => m.user_a === user.id ? m.user_b : m.user_a);
    const { data: profiles } = await supabase.from('users').select('id, display_name, avatar_url, tagline, last_active_at').in('id', otherIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get conversations for these matches
    const matchIds = matchRows.map(m => m.id);
    const { data: convos } = await supabase.from('conversations').select('id, match_id, last_message_at').in('match_id', matchIds);
    const convoMap = new Map((convos || []).map(c => [c.match_id, c]));

    // Build match items
    const items: MatchItem[] = matchRows.map(m => {
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const profile = profileMap.get(otherId);
      const convo = convoMap.get(m.id);
      const lastActive = profile?.last_active_at ? new Date(profile.last_active_at) : null;
      const isOnline = lastActive ? (Date.now() - lastActive.getTime()) < 10 * 60 * 1000 : false;
      return {
        matchId: m.id, conversationId: convo?.id || null, userId: otherId,
        displayName: profile?.display_name || 'Anonymous',
        avatarUrl: profile?.avatar_url || '',
        tagline: profile?.tagline || '',
        lastMessage: '', lastMessageAt: convo?.last_message_at || m.matched_at,
        isOnline, unread: 0,
      };
    });

    setMatches(items);
    setLoading(false);
  };

  const handleChat = async (match: MatchItem) => {
    let convoId = match.conversationId;
    if (!convoId) {
      // Create conversation
      const { data } = await supabase.from('conversations').insert({ match_id: match.matchId }).select('id').single();
      if (data) convoId = data.id;
    }
    if (convoId) onOpenChat(match.userId, match.displayName, convoId);
  };

  const unmatch = async (matchId: string) => {
    await supabase.from('matches').update({ is_active: false, unmatched_at: new Date().toISOString() }).eq('id', matchId);
    setMatches(m => m.filter(x => x.matchId !== matchId));
  };

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (loading) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontFamily: "'DM Sans', sans-serif" }}>Loading matches...</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: '20px 20px 10px' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Matches</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textDim }}>{matches.length} connection{matches.length !== 1 ? 's' : ''}</p>
      </div>

      {matches.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💜</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>No matches yet</div>
          <div style={{ fontSize: 13, color: C.textDim }}>Browse Discovery and like someone — if they like you back, you'll match</div>
        </div>
      ) : (
        <div style={{ padding: '0 12px' }}>
          {matches.map(match => (
            <div key={match.matchId} onClick={() => handleChat(match)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 8px',
              borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
              transition: 'background 0.15s',
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${match.isOnline ? C.green : 'transparent'}` }}>
                  {match.avatarUrl ? (
                    <img src={match.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: C.textDim }}>👤</div>
                  )}
                </div>
                {match.isOnline && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: C.green, border: `2px solid ${C.bg}` }} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{match.displayName}</span>
                  <span style={{ fontSize: 11, color: C.textDim }}>{timeAgo(match.lastMessageAt)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.textDim, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {match.tagline || 'Tap to start chatting'}
                </div>
              </div>

              {/* Unread badge */}
              {match.unread > 0 && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.purple, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{match.unread}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchesScreen;
