// src/screens/MapScreen.tsx — MapLibre GL JS + 3D Buildings + Street View
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const C = {
  bg: '#04040a', surface: '#0d0d14', purple: '#a855f7', pink: '#ec4899',
  amber: '#fbbf24', green: '#4ade80', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

// OpenFreeMap dark style with building data (free, no API key)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

// Fallback: CARTO dark-matter
const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const MapScreen: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState<'pins' | 'heat'>('pins');
  const [streetView, setStreetView] = useState<{ lng: number; lat: number } | null>(null);
  const [locating, setLocating] = useState(true);

  // Get real location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc([pos.coords.longitude, pos.coords.latitude]); setLocating(false); },
      () => { setUserLoc([-73.9857, 40.7484]); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !userLoc) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: CARTO_STYLE,
      center: userLoc,
      zoom: 16,
      pitch: 60,
      bearing: -17.6,
      antialias: true,
      maxPitch: 70,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'bottom-right');

    map.on('load', () => {
      // Add 3D buildings layer
      const layers = map.getStyle().layers;
      // Find the label layer to insert buildings below it
      let labelLayerId = '';
      for (const layer of layers || []) {
        if ((layer as any).type === 'symbol' && (layer as any).layout?.['text-field']) {
          labelLayerId = layer.id;
          break;
        }
      }

      // Try to add 3D buildings from existing source
      try {
        map.addLayer({
          id: '3d-buildings',
          source: 'carto',
          'source-layer': 'building',
          filter: ['==', '$type', 'Polygon'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate', ['linear'], ['get', 'render_height'],
              0, '#0a0a12',
              50, '#12121f',
              100, '#1a1a2e',
              200, '#22223a',
            ],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.7,
          },
        }, labelLayerId || undefined);
      } catch (e) {
        // If carto source doesn't have buildings, add from OpenMapTiles
        try {
          map.addSource('openmaptiles', {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
          });
          map.addLayer({
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            filter: ['==', '$type', 'Polygon'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#12121f',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.6,
            },
          });
        } catch {}
      }

      // Purple glow ground layer under user
      map.addSource('user-glow', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: userLoc }, properties: {} }] },
      });
      map.addLayer({
        id: 'user-glow-layer',
        type: 'circle',
        source: 'user-glow',
        paint: {
          'circle-radius': 40,
          'circle-color': C.purple,
          'circle-opacity': 0.15,
          'circle-blur': 1,
        },
      });

      // Heatmap pulse layer
      map.addSource('pulse', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
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

      // Long press / right click = street view at that point
      map.on('contextmenu', (e) => {
        setStreetView({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });

      // Mobile: long press via touchhold
      let touchTimer: ReturnType<typeof setTimeout>;
      map.getCanvas().addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchTimer = setTimeout(() => {
            const rect = map.getCanvas().getBoundingClientRect();
            const point = map.unproject([
              e.touches[0].clientX - rect.left,
              e.touches[0].clientY - rect.top,
            ]);
            setStreetView({ lng: point.lng, lat: point.lat });
          }, 600);
        }
      });
      map.getCanvas().addEventListener('touchend', () => clearTimeout(touchTimer));
      map.getCanvas().addEventListener('touchmove', () => clearTimeout(touchTimer));
    });

    mapRef.current = map;
    return () => map.remove();
  }, [userLoc]);

  const toggleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = mode === 'pins' ? 'heat' : 'pins';
    setMode(next);
    try { map.setLayoutProperty('pulse-heat', 'visibility', next === 'heat' ? 'visible' : 'none'); } catch {}
  };

  const openGoogleStreetView = (lng: number, lat: number) => {
    window.open(`https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m1!1e1`, '_blank');
  };

  const openNavigation = (lng: number, lat: number) => {
    // Deep link to native maps for navigation
    const isIOS = /iPhone|iPad/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  if (locating) return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 32 }}>📍</div>
      <div style={{ color: C.textDim, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Finding your location...</div>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.bg }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'linear-gradient(to bottom, rgba(4,4,10,0.9), transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: C.text, display: 'flex' }}>
            <span>ALL</span><span style={{ color: C.amber }}>NIGHT</span><span>LONG</span>
          </div>
          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 3, marginTop: -2 }}>NIGHTPULSE</div>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button onClick={toggleMode} style={{
            background: mode === 'heat' ? C.purple : 'rgba(255,255,255,0.1)',
            color: C.text, border: 'none', borderRadius: 20, padding: '7px 14px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>{mode === 'pins' ? '🔥 Pulse' : '📍 Pins'}</button>
          <button onClick={() => {
            const center = mapRef.current?.getCenter();
            if (center) setStreetView({ lng: center.lng, lat: center.lat });
          }} style={{
            background: 'rgba(255,255,255,0.1)', color: C.text, border: 'none',
            borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>👁️ Street</button>
        </div>
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)', color: C.textDim, padding: '6px 14px',
        borderRadius: 20, fontSize: 11, zIndex: 10, pointerEvents: 'none',
        fontFamily: "'DM Sans', sans-serif",
      }}>Long press anywhere for street view</div>

      {/* Street View Modal */}
      {streetView && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 20, display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <h3 style={{ color: C.text, margin: 0, fontSize: 16, fontWeight: 600 }}>
              📍 Street View
            </h3>
            <button onClick={() => setStreetView(null)} style={{ background: 'rgba(255,255,255,0.1)', color: C.text, border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>

          {/* Mapillary embed */}
          <div style={{ flex: 1, overflow: 'hidden', margin: '0 16px', borderRadius: 16 }}>
            <iframe
              src={`https://www.mapillary.com/embed?style=photo&close=true&lat=${streetView.lat}&lng=${streetView.lng}&z=17`}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
              title="Street View"
              allow="fullscreen"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, padding: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <button onClick={() => openGoogleStreetView(streetView.lng, streetView.lat)} style={{
              flex: 1, padding: '14px', background: C.purple, color: '#fff', border: 'none',
              borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Open Google Street View</button>
            <button onClick={() => openNavigation(streetView.lng, streetView.lat)} style={{
              flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', color: C.text,
              border: `1px solid ${C.purple}`, borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>🧭 Navigate</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapScreen;
