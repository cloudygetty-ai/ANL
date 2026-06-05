// src/screens/ProfileScreen.tsx — Pure web, no RN
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../config/supabase';

const C = {
  bg: '#04040a', surface: '#0d0d14', card: '#111118', border: 'rgba(168,85,247,0.15)',
  purple: '#a855f7', pink: '#ec4899', amber: '#fbbf24', green: '#4ade80', red: '#f43f5e',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)', textMid: 'rgba(240,238,232,0.7)',
};

const TAG_OPTIONS = {
  looking_for: ['Men', 'Women', 'Trans', 'Non-binary', 'Couples', 'Groups', 'Everyone'],
  body_type: ['Slim', 'Average', 'Athletic', 'Muscular', 'Stocky', 'Thick', 'Bear', 'Dad bod'],
  position: ['Top', 'Bottom', 'Versatile', 'Vers Top', 'Vers Bottom', 'Side', 'Oral'],
  vibe_tags: ['Chill', 'Party', 'Dance', 'Drinks', 'Late night', 'After hours', 'Day drink', 'Brunch', 'Karaoke', 'Pool party', 'Rooftop', 'Dive bar', 'Club', 'Lounge', 'House party'],
  kinks: ['Vanilla', 'Light kink', 'Bondage', 'Role play', 'Leather', 'Toys', 'Group', 'Voyeur', 'Exhib', 'Dom', 'Sub', 'Switch'],
  into_tags: ['Kissing', 'Cuddling', 'Massage', 'Oral', 'Rimming', 'Anal', 'Mutual', 'JO', 'Edging'],
  interaction: ['Gentle', 'Sensual', 'Rough', 'Aggressive', 'Worship', 'Mutual', 'One-sided'],
  practices: ['Safe only', 'Bareback if PrEP', 'Bareback', 'Ask me'],
  safeguards: ['PrEP', 'DoxyPEP', 'Condoms', 'Tested regularly', 'Vaccinated'],
  hosting_status: ['Can host', 'Can travel', 'Car play', 'Outdoors', 'Hotel', 'Not now'],
  location_prefs: ['Can travel', 'Can host', 'Car play', 'Outdoors only', 'Hotel/Motel'],
  gender: ['Man', 'Woman', 'Trans man', 'Trans woman', 'Non-binary', 'Genderfluid', 'Agender', 'Other'],
  sexual_orientation: ['Gay', 'Straight', 'Bisexual', 'Pansexual', 'Queer', 'Fluid', 'Curious', 'Heteroflexible', 'Homoflexible', 'Asexual'],
  comfort_level: ['Anything goes', 'Open minded', 'Lets discuss', 'Take it slow', 'Vanilla only'],
  relationship_status: ['Single', 'Partnered', 'Open relationship', 'Married open', 'Poly', 'Its complicated'],
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 15, background: C.card,
  color: C.text, border: `1px solid ${C.border}`, borderRadius: 10,
  outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
};

function TagPicker({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(tag => (
          <button key={tag} onClick={() => toggle(tag)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
            background: selected.includes(tag) ? C.purple : 'rgba(255,255,255,0.06)',
            color: selected.includes(tag) ? '#fff' : C.textMid,
            border: `1px solid ${selected.includes(tag) ? C.purple : 'rgba(255,255,255,0.1)'}`,
          }}>{tag}</button>
        ))}
      </div>
    </div>
  );
}

function SinglePicker({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
            background: selected === opt ? C.purple : 'rgba(255,255,255,0.06)',
            color: selected === opt ? '#fff' : C.textMid,
            border: `1px solid ${selected === opt ? C.purple : 'rgba(255,255,255,0.1)'}`,
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 20 }}>
      <h3 style={{ color: C.amber, fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  );
}

const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    if (!isSupabaseReady) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
    else {
      const newProfile = { id: user.id, username: user.phone?.replace('+', '') || '', display_name: '', age: 18, gender: '', photos: [], vibe_tags: [], looking_for: [], kinks: [], into_tags: [], interaction: [], practices: [], safeguards: [], location_prefs: [], carries: [] };
      await supabase.from('users').insert(newProfile);
      setProfile(newProfile);
    }
  };

  const update = (field: string, value: any) => {
    setProfile((p: any) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { id, created_at, updated_at, ...updates } = profile;
    await supabase.from('users').update(updates).eq('id', id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
      const photos = [...(profile.photos || []), publicUrl];
      update('photos', photos);
      if (!profile.avatar_url) update('avatar_url', publicUrl);
    }
    setUploading(false);
  };

  const removePhoto = (url: string) => {
    update('photos', (profile.photos || []).filter((p: string) => p !== url));
    if (profile.avatar_url === url) update('avatar_url', profile.photos?.[0] || '');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!profile) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", overflowY: 'auto', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Profile</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: saved ? C.green : `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
            color: '#fff', fontFamily: "'DM Sans', sans-serif",
          }}>{saving ? '...' : saved ? '✓ Saved' : 'Save'}</button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 600, margin: '0 auto' }}>
        {/* Photos */}
        <Section title="Photos">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {(profile.photos || []).map((url: string, i: number) => (
              <div key={i} style={{ position: 'relative', width: 90, height: 90, borderRadius: 12, overflow: 'hidden', border: profile.avatar_url === url ? `2px solid ${C.purple}` : '2px solid transparent' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removePhoto(url)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer', lineHeight: '22px', padding: 0 }}>×</button>
                {profile.avatar_url !== url && <button onClick={() => update('avatar_url', url)} style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: C.amber, border: 'none', borderRadius: 8, fontSize: 9, padding: '2px 6px', cursor: 'pointer' }}>Main</button>}
              </div>
            ))}
            <label style={{ width: 90, height: 90, borderRadius: 12, border: `2px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 28, color: C.textDim }}>
              {uploading ? '...' : '+'}
              <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} />
            </label>
          </div>
        </Section>

        {/* Basics */}
        <Section title="Basics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Display Name</label>
              <input value={profile.display_name || ''} onChange={e => update('display_name', e.target.value)} placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Age</label>
              <input type="number" value={profile.age || ''} onChange={e => update('age', parseInt(e.target.value) || 18)} min={18} max={99} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Height</label>
              <input value={profile.height || ''} onChange={e => update('height', e.target.value)} placeholder="5'9&quot;" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Weight</label>
              <input value={profile.weight || ''} onChange={e => update('weight', e.target.value)} placeholder="180lb" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Tagline</label>
            <input value={profile.tagline || ''} onChange={e => update('tagline', e.target.value)} placeholder="Power TOP, Night owl, etc." style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Bio</label>
            <textarea value={profile.bio || ''} onChange={e => update('bio', e.target.value)} placeholder="Tell people about yourself..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <SinglePicker label="Gender" options={TAG_OPTIONS.gender} selected={profile.gender || ''} onChange={v => update('gender', v)} />
          <SinglePicker label="Orientation" options={TAG_OPTIONS.sexual_orientation} selected={profile.sexual_orientation || ''} onChange={v => update('sexual_orientation', v)} />
          <SinglePicker label="Body Type" options={TAG_OPTIONS.body_type} selected={profile.body_type || ''} onChange={v => update('body_type', v)} />
          <SinglePicker label="Position" options={TAG_OPTIONS.position} selected={profile.position || ''} onChange={v => update('position', v)} />
          <SinglePicker label="Relationship" options={TAG_OPTIONS.relationship_status} selected={profile.relationship_status || ''} onChange={v => update('relationship_status', v)} />
        </Section>

        {/* Vibes & Nightlife */}
        <Section title="Vibes & Nightlife">
          <TagPicker label="Vibe Tags" options={TAG_OPTIONS.vibe_tags} selected={profile.vibe_tags || []} onChange={v => update('vibe_tags', v)} />
          <TagPicker label="Looking For" options={TAG_OPTIONS.looking_for} selected={profile.looking_for || []} onChange={v => update('looking_for', v)} />
        </Section>

        {/* Location & Hosting */}
        <Section title="Location & Hosting">
          <SinglePicker label="Hosting Status" options={TAG_OPTIONS.hosting_status} selected={profile.hosting_status || ''} onChange={v => update('hosting_status', v)} />
          <TagPicker label="Location Preferences" options={TAG_OPTIONS.location_prefs} selected={profile.location_prefs || []} onChange={v => update('location_prefs', v)} />
        </Section>

        {/* Intimacy */}
        <Section title="Intimacy">
          <TagPicker label="Kinks" options={TAG_OPTIONS.kinks} selected={profile.kinks || []} onChange={v => update('kinks', v)} />
          <TagPicker label="Into" options={TAG_OPTIONS.into_tags} selected={profile.into_tags || []} onChange={v => update('into_tags', v)} />
          <TagPicker label="Interaction Style" options={TAG_OPTIONS.interaction} selected={profile.interaction || []} onChange={v => update('interaction', v)} />
          <SinglePicker label="Practices" options={TAG_OPTIONS.practices} selected={(profile.practices || [])[0] || ''} onChange={v => update('practices', [v])} />
          <SinglePicker label="Comfort Level" options={TAG_OPTIONS.comfort_level} selected={profile.comfort_level || ''} onChange={v => update('comfort_level', v)} />
        </Section>

        {/* Health & Safety */}
        <Section title="Health & Safety">
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 4 }}>Last STI Test</label>
            <input type="date" value={profile.sti_tested_date || ''} onChange={e => update('sti_tested_date', e.target.value)} style={inputStyle} />
          </div>
          <TagPicker label="Safeguards" options={TAG_OPTIONS.safeguards} selected={profile.safeguards || []} onChange={v => update('safeguards', v)} />
        </Section>

        {/* Account */}
        <Section title="Account">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '14px', background: C.card, borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Subscription</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{(profile.subscription_tier || 'free').toUpperCase()}</div>
            </div>
            {profile.subscription_tier === 'free' && (
              <button style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${C.amber}, ${C.pink})`, color: '#000', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Upgrade</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '14px', background: C.card, borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Verified</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{profile.is_verified ? '✓ Verified' : 'Not verified'}</div>
            </div>
            {!profile.is_verified && (
              <button style={{ padding: '8px 16px', background: C.purple, color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Verify</button>
            )}
          </div>
          <button onClick={signOut} style={{ width: '100%', padding: '14px', background: 'rgba(244,63,94,0.1)', color: C.red, border: `1px solid rgba(244,63,94,0.3)`, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>Sign Out</button>
          <button style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(244,63,94,0.5)', border: `1px solid rgba(244,63,94,0.15)`, borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Delete Account</button>
        </Section>
      </div>
    </div>
  );
};

export default ProfileScreen;
