// src/screens/DiscoveryScreen.tsx — Pure web, Supabase-powered
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseReady } from '../config/supabase';

const C = {
  bg: '#04040a', surface: '#0d0d14', card: '#111118', border: 'rgba(168,85,247,0.15)',
  purple: '#a855f7', pink: '#ec4899', amber: '#fbbf24', green: '#4ade80', red: '#f43f5e',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)', textMid: 'rgba(240,238,232,0.7)',
};

interface UserCard {
  id: string; display_name: string; age: number; gender: string; bio: string;
  tagline: string; body_type: string; position: string; photos: string[];
  vibe_tags: string[]; looking_for: string[]; hosting_status: string;
  avatar_url: string; is_verified: boolean; sexual_orientation: string;
  height: string; weight: string;
}

const DiscoveryScreen: React.FC = () => {
  const [users, setUsers] = useState<UserCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'like' | 'pass' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [myId, setMyId] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    if (!isSupabaseReady) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);
    // Get already swiped IDs
    const { data: swiped } = await supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id);
    const swipedIds = (swiped || []).map(s => s.swiped_id);
    // Get blocked IDs
    const { data: blocked } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id);
    const blockedIds = (blocked || []).map(b => b.blocked_id);
    const excludeIds = [...swipedIds, ...blockedIds, user.id];
    // Fetch nearby users (for now, all users except excluded)
    let query = supabase.from('users').select('*').not('id', 'in', `(${excludeIds.join(',')})`).limit(50);
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  };

  const swipe = async (direction: 'like' | 'pass') => {
    const target = users[index];
    if (!target) return;
    setAction(direction);
    await supabase.from('swipes').insert({ swiper_id: myId, swiped_id: target.id, direction });
    // Check for mutual like
    if (direction === 'like') {
      const { data: mutual } = await supabase.from('swipes').select('id').eq('swiper_id', target.id).eq('swiped_id', myId).eq('direction', 'like').single();
      if (mutual) {
        const [a, b] = [myId, target.id].sort();
        await supabase.from('matches').insert({ user_a: a, user_b: b });
      }
    }
    setTimeout(() => { setAction(null); setIndex(i => i + 1); setPhotoIdx(0); setExpanded(false); }, 300);
  };

  const current = users[index];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontFamily: "'DM Sans', sans-serif" }}>Finding people near you...</div>
  );

  if (!current) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontFamily: "'DM Sans', sans-serif", gap: 16, padding: 32 }}>
      <div style={{ fontSize: 48 }}>🌙</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Nobody new right now</div>
      <div style={{ fontSize: 14, textAlign: 'center' }}>Check back later tonight — the night is young</div>
      <button onClick={() => { setIndex(0); loadUsers(); }} style={{ marginTop: 16, padding: '10px 24px', background: C.purple, color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
    </div>
  );

  const photos = current.photos?.length ? current.photos : [current.avatar_url || ''];
  const hasMultiPhotos = photos.length > 1;

  return (
    <div style={{ height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden' }}>
      {/* Card */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        transform: action === 'like' ? 'translateX(100%) rotate(10deg)' : action === 'pass' ? 'translateX(-100%) rotate(-10deg)' : 'none',
        opacity: action ? 0.5 : 1, transition: 'all 0.3s ease',
      }}>
        {/* Photo */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {photos[photoIdx] ? (
            <img src={photos[photoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${C.surface}, ${C.purple}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: C.textDim }}>👤</div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(4,4,10,0.95) 0%, rgba(4,4,10,0.3) 40%, transparent 60%)' }} />
        </div>

        {/* Photo dots */}
        {hasMultiPhotos && (
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, zIndex: 5 }}>
            {photos.map((_, i) => <div key={i} style={{ width: i === photoIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === photoIdx ? C.purple : 'rgba(255,255,255,0.4)', transition: 'width 0.2s' }} />)}
          </div>
        )}

        {/* Photo nav */}
        {hasMultiPhotos && (
          <>
            <div onClick={() => setPhotoIdx(p => Math.max(0, p - 1))} style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '60%', zIndex: 4, cursor: 'pointer' }} />
            <div onClick={() => setPhotoIdx(p => Math.min(photos.length - 1, p + 1))} style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '60%', zIndex: 4, cursor: 'pointer' }} />
          </>
        )}

        {/* Info overlay */}
        <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0, padding: '0 20px', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{current.display_name || 'Anonymous'}</span>
            <span style={{ fontSize: 22, color: C.textMid }}>{current.age}</span>
            {current.is_verified && <span style={{ background: C.green, color: '#000', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>✓</span>}
          </div>
          {current.tagline && <div style={{ fontSize: 14, color: C.amber, marginBottom: 6, fontWeight: 600 }}>"{current.tagline}"</div>}
          <div style={{ fontSize: 13, color: C.textDim, marginBottom: 6 }}>
            {[current.height, current.weight, current.body_type, current.position, current.sexual_orientation].filter(Boolean).join(' · ')}
          </div>
          {current.hosting_status && current.hosting_status !== 'not_hosting' && (
            <div style={{ fontSize: 12, color: C.green, marginBottom: 8 }}>🏠 {current.hosting_status}</div>
          )}
          {(current.vibe_tags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {current.vibe_tags.slice(0, 5).map(tag => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, background: 'rgba(168,85,247,0.2)', color: C.purple, border: `1px solid rgba(168,85,247,0.3)` }}>{tag}</span>
              ))}
            </div>
          )}
          <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 10, background: 'none', border: 'none', color: C.purple, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{expanded ? '▲ Less' : '▼ More'}</button>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0, top: '30%', background: 'rgba(4,4,10,0.95)', overflowY: 'auto', padding: 20, zIndex: 6, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <button onClick={() => setExpanded(false)} style={{ float: 'right', background: 'none', border: 'none', color: C.textDim, fontSize: 20, cursor: 'pointer' }}>×</button>
            <h3 style={{ color: C.text, fontSize: 20, margin: '0 0 4px' }}>{current.display_name}, {current.age}</h3>
            {current.tagline && <p style={{ color: C.amber, fontSize: 14, margin: '0 0 12px' }}>"{current.tagline}"</p>}
            {current.bio && <p style={{ color: C.textMid, fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>{current.bio}</p>}
            {[
              { label: 'Looking For', items: current.looking_for },
              { label: 'Vibes', items: current.vibe_tags },
            ].map(({ label, items }) => items?.length ? (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(t => <span key={t} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, background: 'rgba(255,255,255,0.06)', color: C.textMid, border: `1px solid rgba(255,255,255,0.1)` }}>{t}</span>)}
                </div>
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '16px 20px', background: C.bg, zIndex: 10 }}>
        <button onClick={() => swipe('pass')} style={{ width: 60, height: 60, borderRadius: '50%', border: `2px solid rgba(244,63,94,0.5)`, background: 'rgba(244,63,94,0.1)', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <button onClick={() => swipe('like')} style={{ width: 70, height: 70, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`, fontSize: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${C.purple}44` }}>💜</button>
        <button onClick={() => swipe('like')} style={{ width: 60, height: 60, borderRadius: '50%', border: `2px solid rgba(251,191,36,0.5)`, background: 'rgba(251,191,36,0.1)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</button>
      </div>
    </div>
  );
};

export default DiscoveryScreen;
