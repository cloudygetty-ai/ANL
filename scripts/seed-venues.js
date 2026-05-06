// scripts/seed-venues.js
// Seeds the venues table from OpenStreetMap Overpass API.
// Targets nightlife POIs: bars, clubs, lounges, music venues.
// Run: node scripts/seed-venues.js [--lat=40.7128 --lng=-74.0060 --radius=5000]
// Requires: DATABASE_URL in env or .env file

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace('--', '').split('=')),
);
const LAT    = parseFloat(args.lat    ?? '40.7128');  // NYC default
const LNG    = parseFloat(args.lng    ?? '-74.0060');
const RADIUS = parseInt(args.radius   ?? '5000');     // meters

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// OSM amenity tags that map to nightlife venues
const VENUE_CATEGORY_MAP = {
  bar:           'bar',
  nightclub:     'club',
  pub:           'bar',
  lounge:        'lounge',
  music_venue:   'music',
  casino:        'casino',
  restaurant:    'restaurant',
  cafe:          'cafe',
  food_court:    'food',
  events_venue:  'events',
};

function buildOverpassQuery(lat, lng, radiusM) {
  const amenities = Object.keys(VENUE_CATEGORY_MAP).join('|');
  return `
    [out:json][timeout:30];
    (
      node["amenity"~"${amenities}"](around:${radiusM},${lat},${lng});
      way["amenity"~"${amenities}"](around:${radiusM},${lat},${lng});
    );
    out center;
  `;
}

async function fetchOverpass(query) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  return res.json();
}

function parseElement(el) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  const tags = el.tags ?? {};
  const amenity = tags.amenity ?? '';
  const category = VENUE_CATEGORY_MAP[amenity] ?? 'other';

  const name = tags.name || tags['name:en'] || `${amenity} (OSM ${el.id})`;

  return {
    osm_id:   String(el.id),
    name:     name.slice(0, 120),
    category,
    lat,
    lng,
    address:  [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
                .filter(Boolean).join(' ') || null,
    website:  tags.website || tags.url || null,
    capacity: tags.capacity ? parseInt(tags.capacity) : null,
  };
}

async function upsertVenue(client, venue) {
  await client.query(
    `INSERT INTO venues
       (name, category, lat, lng, address, website, capacity, osm_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (osm_id) DO UPDATE SET
       name     = EXCLUDED.name,
       lat      = EXCLUDED.lat,
       lng      = EXCLUDED.lng,
       category = EXCLUDED.category,
       updated_at = NOW()`,
    [venue.name, venue.category, venue.lat, venue.lng,
     venue.address, venue.website, venue.capacity, venue.osm_id],
  );
}

async function ensureOsmIdColumn(client) {
  await client.query(`
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS osm_id TEXT;
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INT;
    CREATE UNIQUE INDEX IF NOT EXISTS venues_osm_id_idx ON venues (osm_id) WHERE osm_id IS NOT NULL;
  `);
}

async function main() {
  console.log(`[seed-venues] Querying OSM around ${LAT},${LNG} radius=${RADIUS}m`);

  const query = buildOverpassQuery(LAT, LNG, RADIUS);
  const data  = await fetchOverpass(query);
  const elements = data.elements ?? [];

  console.log(`[seed-venues] ${elements.length} OSM elements returned`);

  const venues = elements.map(parseElement).filter(Boolean);
  console.log(`[seed-venues] ${venues.length} valid venues to upsert`);

  const client = await pool.connect();
  try {
    await ensureOsmIdColumn(client);

    let inserted = 0;
    for (const v of venues) {
      await upsertVenue(client, v).catch(err => {
        console.warn(`[seed-venues] skipped "${v.name}": ${err.message}`);
      });
      inserted++;
    }

    const { rows } = await client.query('SELECT COUNT(*) FROM venues');
    console.log(`[seed-venues] Done. ${inserted} upserted. Total in DB: ${rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
