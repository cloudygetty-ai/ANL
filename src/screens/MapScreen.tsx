// src/screens/MapScreen.tsx — MapLibre GL JS + Authentic 3D Buildings
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const C = {
  bg: '#04040a', surface: '#0d0d14', purple: '#a855f7', pink: '#ec4899',
  amber: '#fbbf24', green: '#4ade80', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

// MapTiler 3D dark style — free tier (100k loads/month)
// Using OpenFreeMap as primary (unlimited, free)
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

const MapScreen: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState<'pins' | 'heat'>('pins');
  const [locating, setLocating] = useState(true);

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
      style: STYLE_URL,
      center: userLoc,
      zoom: 16.5,
      pitch: 62,
      bearing: -17.6,
      antialias: true,
      maxPitch: 72,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'bottom-right');

    map.on('load', () => {
      add3DBuildings(map);
      addUserGlow(map, userLoc);
      addPulseLayer(map);
      addAtmosphere(map);
    });

    mapRef.current = map;
    return () => map.remove();
  }, [userLoc]);

  const add3DBuildings = (map: maplibregl.Map) => {
    const layers = map.getStyle().layers || [];
    let labelLayerId = '';
    for (const layer of layers) {
      if ((layer as any).type === 'symbol' && (layer as any).layout?.['text-field']) {
        labelLayerId = layer.id;
        break;
      }
    }

    // Try multiple source-layer names for building data
    const buildingLayers = ['building', 'buildings', 'building-3d'];
    const sources = Object.keys(map.getStyle().sources || {});

    for (const src of sources) {
      for (const sl of buildingLayers) {
        try {
          map.addLayer({
            id: '3d-buildings',
            source: src,
            'source-layer': sl,
            filter: ['==', '$type', 'Polygon'],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
                0,   '#08080f',
                20,  '#0e0e18',
                50,  '#131320',
                100, '#181828',
                200, '#1e1e32',
                400, '#252540',
              ],
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                14, ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                14, ['coalesce', ['get', 'render_min_height'], 0],
              ],
              'fill-extrusion-opacity': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                14, 0.65,
                16, 0.8,
                18, 0.85,
              ],
              'fill-extrusion-flood-light-color': C.purple,
              'fill-extrusion-flood-light-intensity': 0.15,
              'fill-extrusion-vertical-gradient': true,
            },
          }, labelLayerId || undefined);
          return; // Success
        } catch {}
      }
    }

    // Fallback: add OpenMapTiles source for buildings
    try {
      map.addSource('buildings-omt', {
        type: 'vector',
        tiles: ['https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf'],
        maxzoom: 14,
      });
      map.addLayer({
        id: '3d-buildings',
        source: 'buildings-omt',
        'source-layer': 'building',
        filter: ['==', '$type', 'Polygon'],
        type: 'fill-extrusion',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10],
            0, '#08080f', 50, '#131320', 100, '#181828', 200, '#1e1e32',
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.75,
          'fill-extrusion-vertical-gradient': true,
        },
      }, labelLayerId || undefined);
    } catch {}
  };

  const addUserGlow = (map: maplibregl.Map, loc: [number, number]) => {
    map.addSource('user-glow', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: loc }, properties: { r: 50 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: loc }, properties: { r: 25 } },
      ]},
    });
    // Outer glow
    map.addLayer({
      id: 'user-glow-outer', type: 'circle', source: 'user-glow',
      filter: ['==', ['get', 'r'], 50],
      paint: { 'circle-radius': 50, 'circle-color': C.purple, 'circle-opacity': 0.08, 'circle-blur': 1 },
    });
    // Inner glow
    map.addLayer({
      id: 'user-glow-inner', type: 'circle', source: 'user-glow',
      filter: ['==', ['get', 'r'], 25],
      paint: { 'circle-radius': 20, 'circle-color': C.purple, 'circle-opacity': 0.2, 'circle-blur': 0.5 },
    });
  };

  const addPulseLayer = (map: maplibregl.Map) => {
    map.addSource('pulse', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: 'pulse-heat', type: 'heatmap', source: 'pulse',
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': ['get', 'intensity'],
        'heatmap-intensity': 1.5,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)', 0.15, 'rgba(168,85,247,0.25)',
          0.35, 'rgba(168,85,247,0.5)', 0.55, 'rgba(236,72,153,0.6)',
          0.75, 'rgba(251,146,60,0.7)', 1, 'rgba(251,191,36,0.9)',
        ],
        'heatmap-radius': 70, 'heatmap-opacity': 0.85,
      },
    });
  };

  const addAtmosphere = (map: maplibregl.Map) => {
    // Subtle fog for depth
    try {
      (map as any).setFog?.({
        color: '#04040a', 'high-color': '#08081a', 'horizon-blend': 0.08,
        'space-color': '#04040a', 'star-intensity': 0.3,
      });
    } catch {}
  };

  const toggleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = mode === 'pins' ? 'heat' : 'pins';
    setMode(next);
    try { map.setLayoutProperty('pulse-heat', 'visibility', next === 'heat' ? 'visible' : 'none'); } catch {}
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
        background: 'linear-gradient(to bottom, rgba(4,4,10,0.92) 0%, rgba(4,4,10,0.4) 70%, transparent 100%)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: C.text, display: 'flex' }}>
            <span>ALL</span><span style={{ color: C.amber }}>NIGHT</span><span>LONG</span>
          </div>
          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 3, marginTop: -2 }}>NIGHTPULSE</div>
        </div>
        <button onClick={toggleMode} style={{
          pointerEvents: 'auto',
          background: mode === 'heat' ? C.purple : 'rgba(255,255,255,0.1)',
          color: C.text, border: 'none', borderRadius: 20, padding: '7px 14px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          backdropFilter: 'blur(8px)',
        }}>{mode === 'pins' ? '🔥 Pulse' : '📍 Pins'}</button>
      </div>
    </div>
  );
};

export default MapScreen;
