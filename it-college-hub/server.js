const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 10000;
app.use(express.json({ limit: '3mb' }));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
let dbReady = false;
async function initDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hub_notes (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(180) NOT NULL,
      body TEXT NOT NULL,
      image_data TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  dbReady = true;
}
app.get('/api/health', (_req, res) => res.json({ ok: true, database: dbReady }));
app.get('/api/notes', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, title, body, image_data, created_at FROM hub_notes ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (e) { console.error(e); res.status(503).json({ error: 'Database is not ready' }); }
});
app.post('/api/notes', async (req, res) => {
  const { title, body, image_data } = req.body || {};
  if (!title || !body || String(title).length > 180) return res.status(400).json({ error: 'Invalid title or body' });
  if (image_data && (!String(image_data).startsWith('data:image/') || String(image_data).length > 2800000)) return res.status(400).json({ error: 'Invalid image or image too large' });
  try {
    const result = await pool.query(
      'INSERT INTO hub_notes(title, body, image_data) VALUES($1,$2,$3) RETURNING id,title,body,image_data,created_at',
      [String(title).trim(), String(body).trim(), image_data || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.error(e); res.status(503).json({ error: 'Could not save post' }); }
});
const webRoot = path.join(__dirname, 'dist/it-college-hub/browser');
app.use(express.static(webRoot));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(webRoot, 'index.html'));
});
initDb().then(() => {
  app.listen(port, '0.0.0.0', () => console.log('IT College Hub listening on ' + port));
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});