// ALTERE Search Orchestrator
// Flow: identify → verify via SerpAPI → find dupes → score → cache → respond

import { initDB, getTodaySearchCount, getAnonymousSearchCount, logSearch, logAnonymousSearch } from '../lib/db.js';
import { getSessionFromRequest } from '../lib/session.js';
import { identifyFromText, identifyFromImage, identifyFromUrl } from '../lib/identify.js';
import { searchGoogleShopping } from '../lib/serpapi.js';
import { searchDupes, scoreDupes } from '../lib/dupe_finder.js';
import { hashQuery, getCached, setCached } from '../lib/cache.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.headers['x-real-ip']
           || req.socket?.remoteAddress
           || 'unknown';

  try {
    await initDB();
    const userId = await getSessionFromRequest(req);

    // --- Rate limiting ---
    if (userId) {
      const todayCount = await getTodaySearchCount(userId);
      if (todayCount >= 1) {
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        return res.status(429).json({
          error: 'daily_limit',
          message: 'You have used your daily search. Come back tomorrow!',
          reset_at: tomorrow.toISOString(),
          searches_remaining: 0,
        });
      }
    } else {
      const anonCount = await getAnonymousSearchCount(ip);
      if (anonCount >= 3) {
        return res.status(429).json({
          error: 'signup_required',
          message: 'You have used all 3 free searches. Sign in to continue.',
          searches_remaining: 0,
        });
      }
    }

    // --- Parse input ---
    const body = req.body || {};
    const inputType = body.type || 'text'; // 'text', 'image', 'url'
    const query = body.query || body.text || '';
    const imageData = body.image || null;     // base64 string
    const mediaType = body.media_type || 'image/jpeg';
    const url = body.url || '';

    // --- Cache check ---
    const cacheKey = hashQuery(query || url || (imageData || '').substring(0, 100), { type: inputType });
    const cached = await getCached(cacheKey, 'full_result');
    if (cached) {
      // Log the search even if cached
      if (userId) await logSearch(userId, ip, query || url || 'image search');
      else await logAnonymousSearch(ip);

      const remaining = userId
        ? Math.max(0, 1 - await getTodaySearchCount(userId))
        : Math.max(0, 3 - await getAnonymousSearchCount(ip));

      return res.status(200).json({
        ...cached,
        search_meta: { cached: true, duration_ms: Date.now() - startTime },
        _rateLimit: { remaining, limit: userId ? 1 : 3 },
      });
    }

    // --- Step 1: Identify the product ---
    let productInfo;
    try {
      if (inputType === 'image' && imageData) {
        productInfo = await identifyFromImage(imageData, mediaType);
      } else if (inputType === 'url' && url) {
        productInfo = await identifyFromUrl(url);
      } else {
        productInfo = await identifyFromText(query);
      }
    } catch (err) {
      console.error('[chat] Identification failed:', err.message);
      return res.status(200).json({
        original: { found: false, description: query || 'Unknown item' },
        dupes: [],
        not_found: true,
        message: 'We could not identify this product. Try a different description or a clearer photo.',
        _rateLimit: { remaining: 0, limit: userId ? 1 : 3 },
      });
    }

    // --- Step 2: Verify original via SerpAPI Shopping ---
    let originalVerified = null;
    if (productInfo.confidence >= 70 && productInfo.search_query) {
      try {
        const shopResults = await searchGoogleShopping(productInfo.search_query, { num: 5 });
        if (shopResults.length > 0) {
          // Pick the best match — prefer official brand sources
          const best = shopResults[0];
          originalVerified = {
            found: true,
            brand: productInfo.brand || '',
            name: productInfo.product_name || best.title,
            price: best.price || '',
            image: best.thumbnail || '',
            source: best.source || '',
            link: best.link || '',
            description: `${productInfo.product_name} by ${productInfo.brand}. ${productInfo.color || ''} ${productInfo.material || ''}`.trim(),
            category: productInfo.category || 'clothing',
          };
        }
      } catch (err) {
        console.error('[chat] Original verification failed:', err.message);
      }
    }

    // Fallback if not verified
    if (!originalVerified) {
      originalVerified = {
        found: false,
        brand: productInfo.brand || '',
        name: productInfo.product_name || '',
        description: `${productInfo.product_name || query} — ${productInfo.color || ''} ${productInfo.material || ''} ${productInfo.category || ''}`.trim(),
        category: productInfo.category || 'clothing',
      };
    }

    // --- Step 3: Find dupes ---
    let scoredDupes = [];
    let dupesLimited = false;
    try {
      const candidates = await searchDupes(productInfo);
      if (candidates.length > 0) {
        scoredDupes = await scoreDupes(productInfo, candidates);
      }
      dupesLimited = scoredDupes.length < 3;
    } catch (err) {
      console.error('[chat] Dupe search failed:', err.message);
      dupesLimited = true;
    }

    // Format dupes for frontend
    const dupes = scoredDupes.map(d => ({
      store: d.source || '',
      name: d.title || '',
      price: d.price || '',
      image: d.thumbnail || '',
      link: d.link || '',
      match_score: d.match_score || 0,
      savings_percent: (originalVerified.found && d.extracted_price && originalVerified.price)
        ? Math.round((1 - d.extracted_price / parseFloat(originalVerified.price.replace(/[^0-9.]/g, ''))) * 100)
        : null,
    }));

    // --- Build response ---
    const result = {
      original: originalVerified,
      dupes,
      dupes_limited: dupesLimited,
      not_found: !originalVerified.found && dupes.length === 0,
      message: (!originalVerified.found && dupes.length === 0)
        ? 'We couldn\'t verify this product or find quality dupes. Try a different description.'
        : undefined,
    };

    // --- Cache the result ---
    try {
      await setCached(cacheKey, 'full_result', result);
    } catch (err) {
      console.error('[chat] Cache write failed:', err.message);
    }

    // --- Log the search ---
    if (userId) {
      await logSearch(userId, ip, query || url || 'image search');
    } else {
      await logAnonymousSearch(ip);
    }

    const remaining = userId
      ? Math.max(0, 1 - await getTodaySearchCount(userId))
      : Math.max(0, 3 - await getAnonymousSearchCount(ip));

    return res.status(200).json({
      ...result,
      search_meta: { cached: false, duration_ms: Date.now() - startTime },
      _rateLimit: { remaining, limit: userId ? 1 : 3 },
    });

  } catch (err) {
    console.error('[chat] Unhandled error:', err);
    return res.status(500).json({ error: 'Search failed', message: err.message });
  }
}
