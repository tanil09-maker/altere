// Vercel Serverless Function — proxies requests to Claude API
// The API key is stored as an environment variable (ANTHROPIC_API_KEY)
// Free users get 10 searches per day tracked by IP

const DAILY_LIMIT = 10;
const rateLimitStore = new Map(); // IP -> { count, resetAt }

function getRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  // Reset if expired or doesn't exist
  if (!entry || now > entry.resetAt) {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    entry = { count: 0, resetAt: midnight.getTime() };
    rateLimitStore.set(ip, entry);
  }

  return entry;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  }
}, 60 * 60 * 1000); // every hour

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  // Rate limiting by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.headers['x-real-ip']
           || req.socket?.remoteAddress
           || 'unknown';

  const limit = getRateLimit(ip);

  if (limit.count >= DAILY_LIMIT) {
    const hoursLeft = Math.ceil((limit.resetAt - Date.now()) / (1000 * 60 * 60));
    return res.status(429).json({
      error: 'rate_limited',
      message: `Daily free limit reached (${DAILY_LIMIT} searches). Resets in ~${hoursLeft}h.`,
      remaining: 0,
      limit: DAILY_LIMIT,
      resetAt: limit.resetAt
    });
  }

  // Forward request to Claude API
  try {
    const body = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Success — increment counter
    limit.count++;

    return res.status(200).json({
      ...data,
      _rateLimit: {
        remaining: DAILY_LIMIT - limit.count,
        limit: DAILY_LIMIT,
        resetAt: limit.resetAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}
