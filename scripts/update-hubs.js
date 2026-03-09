const fs = require('fs');
const path = require('path');

const CITIES = [
  { slug: 'ruhr', feed: 'donkey_ruhr' },
  // If the feed slug is different, update the feed value above.
  // e.g. { slug: 'ruhr', feed: 'donkey_ruhr-region' }
];

const BASE = 'https://stables.donkey.bike/api/public/gbfs/3.0';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function updateCity({ slug, feed }) {
  console.log(`Fetching data for ${slug}...`);

  const [infoData, statusData] = await Promise.all([
    fetchJSON(`${BASE}/${feed}/station_information.json`),
    fetchJSON(`${BASE}/${feed}/station_status.json`),
  ]);

  const statusById = {};
  for (const s of statusData.data.stations) {
    statusById[s.station_id] = s.num_bikes_available;
  }

  const hubs = infoData.data.stations
    .filter((s) => s.lat && s.lon)
    .map((s) => ({
      id: s.station_id,
      name: s.name[0]?.text,
      latitude: s.lat,
      longitude: s.lon,
      bikes_available: statusById[s.station_id] ?? null,
    }));

  const outDir = path.join('hub-data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `hubs-${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(hubs, null, 2));
  console.log(`✅ ${slug}: ${hubs.length} hubs written to ${outPath}`);
}

(async () => {
  for (const city of CITIES) {
    try {
      await updateCity(city);
    } catch (err) {
      console.error(`❌ Failed to update ${city.slug}:`, err.message);
      process.exit(1);
    }
  }
})();
