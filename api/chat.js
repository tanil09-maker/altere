// ALTERE Search Orchestrator
// Flow: identify → verify via SerpAPI → find dupes → score → cache → respond

import { initDB, getTodaySearchCount, getAnonymousSearchCount, logSearch, logAnonymousSearch, getUserById } from '../lib/db.js';
import { getSessionFromRequest } from '../lib/session.js';
import { detectRegion, getRegionConfig, getRegionStoreSet, getSerpApiParams } from '../lib/region.js';

const DAILY_LIMIT = 10;
import { identifyFromText, identifyFromImage, identifyFromUrl, verifyOriginals } from '../lib/identify.js';
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
    let user = null;
    let isAdmin = false;

    // --- Rate limiting ---
    if (userId) {
      user = await getUserById(userId);
      isAdmin = user?.is_admin === true;

      if (!isAdmin) {
        const todayCount = await getTodaySearchCount(userId);
        if (todayCount >= DAILY_LIMIT) {
          const tomorrow = new Date();
          tomorrow.setUTCHours(24, 0, 0, 0);
          return res.status(429).json({
            error: 'daily_limit',
            message: `Daily limit reached. You have used all ${DAILY_LIMIT} searches today.`,
            reset_at: tomorrow.toISOString(),
            searches_remaining: 0,
            searches_used: todayCount,
            searches_total: DAILY_LIMIT,
          });
        }
      }
      // Admin: no rate limit check, falls through
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
    const intent = body.intent || 'identify_and_dupes'; // 'identify_and_dupes' | 'dupes_only'

    // --- Region detection ---
    const countryCode = body.country || req.headers['x-vercel-ip-country'] || null;
    const region = body.region || detectRegion(countryCode);
    const regionConfig = getRegionConfig(region);
    const storeSet = getRegionStoreSet(region);
    const serpApiParams = getSerpApiParams(region, countryCode);

    // --- Cache check (includes region) ---
    const cacheKey = hashQuery(query || url || (imageData || '').substring(0, 100), { type: inputType, region });
    const cached = await getCached(cacheKey, 'full_result');
    if (cached) {
      // Log the search even if cached
      if (userId) await logSearch(userId, ip, query || url || 'image search');
      else await logAnonymousSearch(ip);

      const rateMeta = await buildRateMeta(userId, user, isAdmin, ip);

      return res.status(200).json({
        ...cached,
        search_meta: { cached: true, duration_ms: Date.now() - startTime },
        region_meta: { region, currency: regionConfig.currency, symbol: regionConfig.symbol },
        ...rateMeta,
      });
    }

    // --- Step 1: Identify product (returns 2 luxury originals + dupe hints) ---
    let identified;

    if (intent === 'dupes_only') {
      identified = {
        originals: [],
        key_features: (query || '').split(' ').filter(w => w.length > 3),
        dupe_search_hints: [(query || '').toLowerCase()],
        confidence: 50,
      };
    } else {
      try {
        if (inputType === 'image' && imageData) {
          identified = await identifyFromImage(imageData, mediaType);
        } else if (inputType === 'url' && url) {
          identified = await identifyFromUrl(url);
        } else {
          identified = await identifyFromText(query);
        }
      } catch (err) {
        console.error('[chat] Identification failed:', err.message);
        return res.status(200).json({
          originals: [],
          dupes: [],
          not_found: true,
          message: 'We could not identify this product. Try a different description or a clearer photo.',
          region_meta: { region, currency: regionConfig.currency, symbol: regionConfig.symbol },
          ...(await buildRateMeta(userId, user, isAdmin, ip)),
        });
      }
    }

    // --- Step 2: Verify originals via SerpAPI ---
    let verifiedOriginals = [];
    if (intent !== 'dupes_only' && identified.originals?.length > 0) {
      try {
        verifiedOriginals = await verifyOriginals(identified.originals, serpApiParams);
      } catch (err) {
        console.error('[chat] Original verification failed:', err.message);
      }
    }

    // --- Step 3: Find dupes ---
    // Build productInfo for dupe_finder from identified data
    const productInfo = {
      brand: identified.originals?.[0]?.brand || 'Unknown',
      product_name: identified.originals?.[0]?.product_name || query || '',
      category: identified.originals?.[0]?.category || 'clothing',
      color: identified.originals?.[0]?.color || '',
      material: identified.originals?.[0]?.material || '',
      key_features: identified.key_features || [],
      dupe_search_hints: identified.dupe_search_hints || [(query || '').toLowerCase()],
    };

    let scoredDupes = [];
    let dupesLimited = false;
    try {
      const candidates = await searchDupes(productInfo, { storeSet, serpApiParams });
      if (candidates.length > 0) {
        scoredDupes = await scoreDupes(productInfo, candidates);
      }
      dupesLimited = scoredDupes.length < 3;
    } catch (err) {
      console.error('[chat] Dupe search failed:', err.message);
      dupesLimited = true;
    }

    // Format dupes for frontend
    const symbol = regionConfig.symbol;
    const originalPriceNum = verifiedOriginals[0]?.extracted_price || 0;

    const dupes = scoredDupes.map(d => {
      const dupePrice = d.extracted_price || 0;
      let savings_percent = null;
      let savings_amount = null;
      let savings_display = null;

      if (originalPriceNum > 0 && dupePrice > 0 && dupePrice < originalPriceNum) {
        const rawPercent = Math.round((1 - dupePrice / originalPriceNum) * 100);
        savings_amount = Math.round(originalPriceNum - dupePrice);
        if (rawPercent > 95) {
          savings_percent = 95;
          savings_display = { type: 'amount', value: `${symbol}${savings_amount}` };
        } else {
          savings_percent = rawPercent;
          savings_display = { type: 'percent', value: `${rawPercent}%` };
        }
      }

      return {
        store: d.source || '',
        name: d.title || '',
        price: d.price || '',
        extracted_price: dupePrice,
        image: d.thumbnail || '',
        link: d.link || '',
        match_score: d.match_score || 0,
        savings_percent,
        savings_amount,
        savings_display,
      };
    });

    // --- Build response ---
    const result = {
      originals: verifiedOriginals,
      dupes,
      dupes_limited: dupesLimited,
      not_found: verifiedOriginals.length === 0 && dupes.length === 0,
      message: (verifiedOriginals.length === 0 && dupes.length === 0)
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

    const rateMeta = await buildRateMeta(userId, user, isAdmin, ip);

    return res.status(200).json({
      ...result,
      search_meta: { cached: false, duration_ms: Date.now() - startTime },
      region_meta: { region, currency: regionConfig.currency, symbol: regionConfig.symbol },
      ...rateMeta,
    });

  } catch (err) {
    console.error('[chat] Unhandled error:', err);
    return res.status(500).json({ error: 'Search failed', message: err.message });
  }
}

async function buildRateMeta(userId, user, isAdmin, ip) {
  if (userId) {
    const todayCount = await getTodaySearchCount(userId);
    return {
      _rateLimit: {
        remaining: isAdmin ? -1 : Math.max(0, DAILY_LIMIT - todayCount),
        limit: isAdmin ? -1 : DAILY_LIMIT,
      },
      user_meta: {
        is_admin: isAdmin,
        searches_used_today: todayCount,
        searches_remaining: isAdmin ? -1 : Math.max(0, DAILY_LIMIT - todayCount),
        daily_limit: DAILY_LIMIT,
      },
    };
  }
  const anonCount = await getAnonymousSearchCount(ip);
  return {
    _rateLimit: {
      remaining: Math.max(0, 3 - anonCount),
      limit: 3,
    },
  };
}
