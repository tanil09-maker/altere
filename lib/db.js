import { neon } from '@neondatabase/serverless';

let sql;

function getSQL() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function initDB() {
  const db = getSQL();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS search_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      ip TEXT,
      query TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS anonymous_searches (
      id SERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS search_cache (
      id SERIAL PRIMARY KEY,
      query_hash TEXT UNIQUE NOT NULL,
      cache_type TEXT NOT NULL,
      data JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON search_cache(query_hash)`;
  await db`CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at)`;

  // Add is_admin column (idempotent)
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`;

  // Seed admin
  await db`UPDATE users SET is_admin = TRUE WHERE email = 'tanil09@gmail.com'`;

  // Cache v2: clear old cache from before store whitelist + savings fix
  await db`DELETE FROM search_cache WHERE created_at < '2026-04-30'`; // v5: 2 originals + currency fix
}

export async function getUserByGoogleId(googleId) {
  const db = getSQL();
  const rows = await db`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
  return rows[0] || null;
}

export async function getUserById(id) {
  const db = getSQL();
  const rows = await db`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function createUser({ googleId, email, name, picture }) {
  const db = getSQL();
  const rows = await db`
    INSERT INTO users (google_id, email, name, picture)
    VALUES (${googleId}, ${email}, ${name}, ${picture})
    ON CONFLICT (google_id) DO UPDATE SET email = ${email}, name = ${name}, picture = ${picture}
    RETURNING *
  `;
  return rows[0];
}

export async function getTodaySearchCount(userId) {
  const db = getSQL();
  const rows = await db`
    SELECT COUNT(*)::int AS count FROM search_history
    WHERE user_id = ${userId}
      AND created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day'
  `;
  return rows[0]?.count || 0;
}

export async function getAnonymousSearchCount(ip) {
  const db = getSQL();
  const rows = await db`
    SELECT COUNT(*)::int AS count FROM anonymous_searches
    WHERE ip = ${ip}
  `;
  return rows[0]?.count || 0;
}

export async function logSearch(userId, ip, query) {
  const db = getSQL();
  await db`INSERT INTO search_history (user_id, ip, query) VALUES (${userId}, ${ip}, ${query})`;
}

export async function logAnonymousSearch(ip) {
  const db = getSQL();
  await db`INSERT INTO anonymous_searches (ip) VALUES (${ip})`;
}
