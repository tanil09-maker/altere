// Search result cache backed by Neon Postgres
import { neon } from '@neondatabase/serverless';

let sql;
function getSQL() {
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

export function hashQuery(query, options = {}) {
  // Simple deterministic hash — no crypto import needed in serverless
  const input = JSON.stringify({ q: (query || '').trim().toLowerCase(), ...options });
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  // Convert to hex-like string for readability
  return 'c_' + (hash >>> 0).toString(36);
}

export async function getCached(queryHash, type) {
  const db = getSQL();
  const rows = await db`
    SELECT data FROM search_cache
    WHERE query_hash = ${queryHash}
      AND cache_type = ${type}
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0]?.data || null;
}

export async function setCached(queryHash, type, data, ttlDays) {
  const days = ttlDays || parseInt(process.env.SEARCH_CACHE_DAYS || '7', 10);
  const db = getSQL();
  await db`
    INSERT INTO search_cache (query_hash, cache_type, data, expires_at)
    VALUES (${queryHash}, ${type}, ${JSON.stringify(data)}, NOW() + ${days + ' days'}::interval)
    ON CONFLICT (query_hash) DO UPDATE
      SET data = ${JSON.stringify(data)},
          cache_type = ${type},
          expires_at = NOW() + ${days + ' days'}::interval
  `;
}

export async function cleanupExpiredCache() {
  const db = getSQL();
  await db`DELETE FROM search_cache WHERE expires_at < NOW()`;
}
