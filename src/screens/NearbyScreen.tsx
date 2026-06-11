// src/screens/NearbyScreen.tsx — Grid of nearby profiles (photo/video)
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../config/supabase';

const C = {
  bg: '#04040a', surface: '#0d0d14', card: '#111118', border: 'rgba(168,85,247,0.15)',
  purple: '#a855f7', pink: '#ec4899', amber: '#fbbf24', green: '#4ade80', red: '#f43f5e',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)', textMid: 'rgba(240,238,232,0.7)',
};

interface NearbyUser {
  id: string; display_name: string; age: number; gender: string;
  avatar_url: string; photos: string[]; tagline: string; body_type: string;
  position: string; hosting_status: string; is_verified: boolean;
  vibe_tags: string[]; bio: string; height: string; weight: string;
  sexual_orientation: string; looking_for: string[]; kinks: string[];
  into_tags: string[]; last_active_at: string;
}

interface Props { onViewProfile: (user: NearbyUser) => void; }

const NearbyScreen: React.FC<Props> = ({ onViewProfile }) => {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'hosting'>('all');

  useEffect(() => { loadNearby(); }, []);

  const loadNearby = async () => {
    if (!isSupabaseReady) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('users').select('*').neq('id', user.id).order('last_active_at', { ascending: false }).limit(60);
    setUsers(data || []);
    setLoading(false);
  };

  const isOnline = (lastActive: string) => lastActive && (Date.now() - new Date(lastActive).getTime()) < 10 * 60 * 1000;
  const isVideo = (url: string) => /\.(mp4|mov|webm)$/i.test(url);

  const filtered = users.filter(u => {
    if (filter === 'online') return isOnline(u.last_active_at);
    if (filter === 'hosting') return u.hosting_status && u.hosting_status !== 'not_hosting' && u.hosting_status !== 'Not now';
    return true;
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontFamily: "'DM Sans', sans-serif" }}>Loading nearby...</div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', position: 'sticky', top: 0, background: C.bg, zIndex: 5 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>Nearby</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['all', 'online', 'hosting'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
              background: filter === f ? C.purple : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#fff' : C.textMid,
              border: `1px solid ${filter === f ? C.purple : 'rgba(255,255,255,0.1)'}`,
              textTransform: 'capitalize',
            }}>{f === 'all' ? `All (${users.length})` : f === 'online' ? `Online (${users.filter(u => isOnline(u.last_active_at)).length})` : `Hosting (${users.filter(u => u.hosting_status && u.hosting_status !== 'not_hosting' && u.hosting_status !== 'Not now').length})`}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌙</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nobody nearby yet</div>
          <div style={{ fontSize: 13, color: C.textDim }}>Check back later tonight</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: '0 2px', paddingBottom: 80 }}>
          {filtered.map(user => {
            const media = user.avatar_url || user.photos?.[0] || '';
            const online = isOnline(user.last_active_at);
            const video = isVideo(media);

            return (
              <div key={user.id} onClick={() => onViewProfile(user)} style={{
                position: 'relative', aspectRatio: '3/4', overflow: 'hidden',
                cursor: 'pointer', background: C.card,
              }}>
                {/* Media */}
                {video ? (
                  <video src={media} muted loop playsInline autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : media ? (
                  <img src={media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: C.textDim, background: `linear-gradient(135deg, ${C.surface}, ${C.purple}11)` }}>👤</div>
                )}

                {/* Video badge */}
                {video && (
                  <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '2px 6px', fontSize: 10, color: '#fff' }}>▶</div>
                )}

                {/* Online indicator */}
                {online && (
                  <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderRadius: '50%', background: C.green, border: '2px solid rgba(0,0,0,0.5)', boxShadow: `0 0 6px ${C.green}` }} />
                )}

                {/* Verified badge */}
                {user.is_verified && (
                  <div style={{ position: 'absolute', top: 6, left: online ? 22 : 6, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '1px 5px', fontSize: 9, color: C.green }}>✓</div>
                )}

                {/* Hosting badge */}
                {user.hosting_status && user.hosting_status !== 'not_hosting' && user.hosting_status !== 'Not now' && (
                  <div style={{ position: 'absolute', top: 6, right: video ? 32 : 6, background: 'rgba(168,85,247,0.8)', borderRadius: 8, padding: '2px 6px', fontSize: 9, color: '#fff', fontWeight: 600 }}>🏠</div>
                )}

                {/* Bottom overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '24px 8px 8px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                    {user.display_name || 'Anonymous'}{user.age ? `, ${user.age}` : ''}
                  </div>
                  {user.tagline && (
                    <div style={{ fontSize: 10, color: C.amber, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.tagline}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── PROFILE VIEW MODAL ──────────────────────────────────────
export function ProfileViewModal({ user, onClose, onMessage }: {
  user: NearbyUser; onClose: () => void; onMessage: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = user.photos?.length ? user.photos : [user.avatar_url || ''];
  const media = photos[photoIdx] || '';
  const video = /\.(mp4|mov|webm)$/i.test(media);

  const tagSection = (label: string, items?: string[]) => {
    if (!items?.length) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map(t => <span key={t} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, background: 'rgba(255,255,255,0.06)', color: C.textMid, border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 50, overflowY: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Media */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', maxHeight: '65vh', overflow: 'hidden' }}>
        {video ? (
          <video src={media} controls playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : media ? (
          <img src={media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: C.textDim }}>👤</div>
        )}
        <button onClick={onClose} style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 20, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>←</button>

        {/* Photo nav */}
        {photos.length > 1 && (
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {photos.map((p, i) => {
              const isVid = /\.(mp4|mov|webm)$/i.test(p);
              return (
                <div key={i} onClick={() => setPhotoIdx(i)} style={{
                  width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
                  border: `2px solid ${i === photoIdx ? C.purple : 'rgba(255,255,255,0.3)'}`,
                }}>
                  {isVid ? (
                    <video src={p} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 16px 16px', background: 'linear-gradient(to top, rgba(4,4,10,0.95), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800 }}>{user.display_name || 'Anonymous'}</span>
            <span style={{ fontSize: 22, color: C.textMid }}>{user.age}</span>
            {user.is_verified && <span style={{ background: C.green, color: '#000', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>✓</span>}
          </div>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
            {[user.height, user.weight, user.body_type, user.position, user.sexual_orientation].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '16px 16px 100px', color: C.text }}>
        {user.tagline && <div style={{ fontSize: 16, color: C.amber, fontWeight: 600, marginBottom: 12 }}>"{user.tagline}"</div>}
        {user.bio && <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5, marginBottom: 16 }}>{user.bio}</p>}

        {user.hosting_status && user.hosting_status !== 'not_hosting' && user.hosting_status !== 'Not now' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: 'rgba(168,85,247,0.1)', borderRadius: 12, border: `1px solid ${C.border}` }}>
            <span>🏠</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{user.hosting_status}</span>
          </div>
        )}

        {tagSection('Looking For', user.looking_for)}
        {tagSection('Vibes', user.vibe_tags)}
        {tagSection('Kinks', user.kinks)}
        {tagSection('Into', user.into_tags)}
      </div>

      {/* Action bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: C.bg, borderTop: `1px solid ${C.border}`,
        display: 'flex', gap: 10, zIndex: 51,
      }}>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: 'rgba(255,255,255,0.06)', color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        <button onClick={onMessage} style={{ flex: 2, padding: 14, background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`, color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>💬 Message</button>
      </div>
    </div>
  );
}

export default NearbyScreen;
