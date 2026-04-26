// Vercel Serverless Function — proxies requests to Claude API
// Rate limiting: anonymous = 3 lifetime, authenticated = 1/day

import { initDB, getTodaySearchCount, getAnonymousSearchCount, logSearch, logAnonymousSearch } from '../lib/db.js';
import { getSessionFromRequest } from '../lib/session.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.headers['x-real-ip']
           || req.socket?.remoteAddress
           || 'unknown';

  try {
    await initDB();
    const userId = await getSessionFromRequest(req);

    // --- Rate limiting ---
    if (userId) {
      // Authenticated: 1 search per day
      const todayCount = await getTodaySearchCount(userId);
      if (todayCount >= 1) {
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        return res.status(429).json({
          error: 'daily_limit',
          message: 'You have used your daily search. Come back tomorrow!',
          reset_at: tomorrow.toISOString(),
          searches_remaining: 0
        });
      }
    } else {
      // Anonymous: 3 lifetime searches
      const anonCount = await getAnonymousSearchCount(ip);
      if (anonCount >= 3) {
        return res.status(429).json({
          error: 'signup_required',
          message: 'You have used all 3 free searches. Sign in to continue.',
          searches_remaining: 0
        });
      }
    }

    // --- Forward to Claude API ---
    const body = req.body;

    // Inject web_search tool if frontend didn't provide tools
    if (!body.tools || body.tools.length === 0) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }];
    }

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

    // Success — log the search
    const query = typeof body.messages?.[0]?.content === 'string'
      ? body.messages[0].content.substring(0, 500)
      : 'image/multimodal search';

    if (userId) {
      await logSearch(userId, ip, query);
      const newCount = await getTodaySearchCount(userId);
      return res.status(200).json({
        ...data,
        _rateLimit: { remaining: Math.max(0, 1 - newCount), limit: 1 }
      });
    } else {
      await logAnonymousSearch(ip);
      const newAnonCount = await getAnonymousSearchCount(ip);
      return res.status(200).json({
        ...data,
        _rateLimit: { remaining: Math.max(0, 3 - newAnonCount), limit: 3 }
      });
    }
  } catch (err) {
    console.error('[chat] Error:', err);
    return res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}
