// src/screens/MapScreen.tsx
// ANL NightPulse Map — MapLibre GL JS (PWA)
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const C = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  green:     '#4ade80',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  femalePin: '#f43f5e',
  malePin:   '#7c3aed',
  nbPin:     '#f59e0b',
};

// Free dark tile style
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface MapUser {
  id: string;
  name: string;
  age: number;
  gender: string;
  coords: [number, number]; // [lng, lat]
  online: boolean;
  compatibility: number;
}

const MOCK_USERS: MapUser[] = [
  { id: '1', name: 'Jade',   age: 26, gender: 'woman',     coords: [-73.9840, 40.7538], online: true,  compatibility: 91 },
  { id: '2', name: 'Marcus', age: 29, gender: 'man',       coords: [-73.9860, 40.7520], online: true,  compatibility: 78 },
  { id: '3', name: 'Riley',  age: 24, gender: 'nonbinary', coords: [-73.9820, 40.7555], online: true,  compatibility: 85 },
  { id: '4', name: 'Zara',   age: 28, gender: 'woman',     coords: [-73.9870, 40.7510], online: false, compatibility: 72 },
  { id: '5', name: 'Devon',  age: 31, gender: 'man',       coords: [-73.9800, 40.7545], online: true,  compatibility: 66 },
];

function pinColor(gender: string): string {
  if (gender === 'woman') return C.femalePin;
  if (gender === 'man') return C.malePin;
  return C.nbPin;
}

const MapScreen: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number]>([-73.9857, 40.7484]); // default NYC
  const [mode, setMode] = useState<'pins' | 'heat'>('pins');

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: userLoc,
      zoom: 15,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    );

    map.on('load', () => {
      // Add user pins
      MOCK_USERS.forEach((u) => {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 36px; height: 36px; border-radius: 50%;
          background: ${pinColor(u.gender)};
          border: 3px solid ${u.online ? C.green : 'rgba(255,255,255,0.2)'};
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: white; font-weight: bold;
          box-shadow: 0 0 ${u.online ? '12px' : '0px'} ${pinColor(u.gender)}88;
          transition: transform 0.2s;
        `;
        el.textContent = u.name[0];
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div style="background:${C.surface};color:${C.text};padding:12px;border-radius:12px;font-family:'DM Sans',sans-serif;min-width:140px;">
              <div style="font-weight:700;font-size:16px;">${u.name}, ${u.age}</div>
              <div style="color:${C.textDim};font-size:12px;margin-top:4px;">${u.compatibility}% match</div>
              <div style="margin-top:8px;display:flex;gap:6px;">
                <span style="background:${C.purple};color:white;padding:4px 10px;border-radius:20px;font-size:11px;cursor:pointer;">Wave</span>
                <span style="background:rgba(255,255,255,0.1);color:${C.text};padding:4px 10px;border-radius:20px;font-size:11px;cursor:pointer;">Profile</span>
              </div>
            </div>
          `);

        new maplibregl.Marker({ element: el })
          .setLngLat(u.coords)
          .setPopup(popup)
          .addTo(map);
      });

      // Heatmap source
      map.addSource('pulse', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: MOCK_USERS.map((u) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: u.coords },
            properties: { intensity: u.online ? 0.9 : 0.3 },
          })),
        },
      });

      map.addLayer({
        id: 'pulse-heat',
        type: 'heatmap',
        source: 'pulse',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(168,85,247,0.3)',
            0.4, 'rgba(168,85,247,0.5)',
            0.6, 'rgba(236,72,153,0.6)',
            0.8, 'rgba(251,191,36,0.7)',
            1, 'rgba(251,191,36,0.9)',
          ],
          'heatmap-radius': 60,
          'heatmap-opacity': 0.8,
        },
      });
    });

    mapRef.current = map;
    return () => map.remove();
  }, [userLoc]);

  const toggleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = mode === 'pins' ? 'heat' : 'pins';
    setMode(next);
    try {
      map.setLayoutProperty('pulse-heat', 'visibility', next === 'heat' ? 'visible' : 'none');
    } catch {}
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: C.bg }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))',
        background: 'linear-gradient(to bottom, rgba(4,4,10,0.9), transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 2,
            color: C.text, display: 'flex', gap: 0,
          }}>
            <span>ALL</span>
            <span style={{ color: C.amber }}>NIGHT</span>
            <span>LONG</span>
          </div>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 3, marginTop: -2 }}>
            NIGHTPULSE
          </div>
        </div>

        <button
          onClick={toggleMode}
          style={{
            pointerEvents: 'auto',
            background: mode === 'heat' ? C.purple : 'rgba(255,255,255,0.1)',
            color: C.text, border: 'none', borderRadius: 20,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            transition: 'background 0.2s',
          }}
        >
          {mode === 'pins' ? '🔥 Pulse' : '📍 Pins'}
        </button>
      </div>

      {/* Bottom nav placeholder */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 20px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, rgba(4,4,10,0.95), transparent)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        zIndex: 10,
      }}>
        {['🗺️', '💬', '🔥', '👤'].map((icon, i) => (
          <button
            key={i}
            style={{
              background: i === 0 ? 'rgba(168,85,247,0.2)' : 'transparent',
              border: 'none', fontSize: 24, padding: '8px 16px',
              borderRadius: 16, cursor: 'pointer',
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapScreen;
