// Dupe finding: Claude generates generic queries, SerpAPI searches, Claude scores

import { searchGoogleShopping } from './serpapi.js';

const MODEL = 'claude-sonnet-4-20250514';

// Default whitelist (used when no regional override)
const DEFAULT_STORES = new Set([
  'zara', 'h&m', 'hm', 'mango', 'asos', 'cos',
  '& other stories', 'other stories', 'massimo dutti',
  'uniqlo', 'pull&bear', 'bershka', 'stradivarius', 'arket', 'weekday',
]);

function normalizeStore(s) {
  if (!s) return '';
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.\-_,]/g, '');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let _storeDebugCount = 0;

function isAllowedStore(sourceText, storeSet) {
  if (!sourceText) return false;
  const allowed = storeSet || DEFAULT_STORES;
  const n = normalizeStore(sourceText);

  // Exact match
  if (allowed.has(n)) {
    if (_storeDebugCount < 5) console.log(`[isAllowedStore] MATCH exact: "${sourceText}" -> "${n}"`);
    return true;
  }

  for (const store of allowed) {
    const s = store.toLowerCase().trim();
    if (n.startsWith(s + ' ') || n.endsWith(' ' + s)) return true;
    try {
      if (new RegExp(`\\b${escapeRegex(s)}\\b`).test(n)) return true;
    } catch { /* skip */ }
    const slug = s.replace(/[&\s]/g, '');
    if (n.includes(slug + 'com') || n.includes(slug + 'stores')) return true;
  }

  // Log rejections (first 5 only)
  if (_storeDebugCount < 5) {
    console.log(`[isAllowedStore] REJECTED: source="${sourceText}" normalized="${n}" | Set has 'cos'=${allowed.has('cos')}`);
    _storeDebugCount++;
  }
  return false;
}

function deduplicateCandidates(candidates) {
  const seen = new Set();
  const unique = [];
  for (const item of candidates) {
    const titleKey = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    const priceKey = Math.round(item.extracted_price || 0);
    const storeKey = normalizeStore(item.source);
    const key = `${titleKey}|${priceKey}|${storeKey}`;
    const linkKey = (item.link || '').split('?')[0];

    if (!seen.has(key) && (!linkKey || !seen.has(linkKey))) {
      seen.add(key);
      if (linkKey) seen.add(linkKey);
      unique.push(item);
    }
  }
  return unique;
}

function getApiKey() {
  return process.env.ANTHROPIC_API_KEY;
}

async function callClaude(system, messages, maxTokens = 1024) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude error ${res.status}: ${err.error?.message || 'unknown'}`);
  }

  const data = await res.json();
  const blocks = data.content || [];
  let text = '';
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === 'text' && blocks[i].text.trim()) {
      text = blocks[i].text.trim();
      break;
    }
  }
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(text);
}

// Claude generates generic product queries (no brand names)
async function generateDupeQueries(productInfo) {
  const brand = productInfo.brand || '';
  const name = productInfo.product_name || '';
  const category = productInfo.category || 'clothing';
  const features = (productInfo.key_features || []).join(', ');
  const color = productInfo.color || '';

  try {
    const result = await callClaude(
      `You generate Google Shopping search queries for finding affordable alternatives to luxury fashion items.

CRITICAL RULES:
- NO luxury brand names (no Chanel, Burberry, Bottega, Hermes, etc.)
- NO words like "dupe", "alternative", "inspired", "replica", "lookalike"
- ONLY product type + visual features + color
- Keep each query under 6 words
- Make queries DIVERSE (different angles on the same product type)

Return JSON: { "queries": ["query1", "query2", "query3", "query4"] }`,
      [{
        role: 'user',
        content: `Luxury item: ${brand} ${name}\nCategory: ${category}\nFeatures: ${features}\nColor: ${color}\n\nGenerate 4 generic search queries.`
      }]
    );
    return result.queries || [];
  } catch (err) {
    console.error('[dupe_finder] Query generation failed:', err.message);
    // Fallback: build queries from features
    const fallback = [];
    if (features) fallback.push(`${category} ${features.split(',')[0]?.trim()}`);
    if (color) fallback.push(`${color} ${category}`);
    fallback.push(category);
    return fallback;
  }
}

// Broad fallback query for when initial queries yield too few results
async function generateBroadQuery(productInfo) {
  try {
    const result = await callClaude(
      `Generate ONE very broad Google Shopping query (max 3 words) for this product type. No brand names. Just the basic item type.\n\nReturn JSON: { "query": "..." }`,
      [{ role: 'user', content: `${productInfo.category || 'fashion'}: ${productInfo.product_name || ''}` }],
      256
    );
    return result.query || productInfo.category || 'fashion';
  } catch {
    return productInfo.category || 'fashion';
  }
}

export async function searchDupes(productInfo, regionOptions = {}) {
  const { storeSet, serpApiParams } = regionOptions;

  // Step 1: Generate generic queries via Claude
  _storeDebugCount = 0;
  console.log('[dupe_finder] serpApiParams:', JSON.stringify(serpApiParams));
  const queries = await generateDupeQueries(productInfo);
  console.log(`[dupe_finder] Generated ${queries.length} queries:`, JSON.stringify(queries));

  // Step 2: Search all queries in PARALLEL with per-query logging
  const searchPromises = queries.map(async (query, idx) => {
    console.log(`[dupe_finder] Query ${idx + 1}/${queries.length}: "${query}"`);
    try {
      const results = await searchGoogleShopping(query, { num: 30, ...serpApiParams });
      console.log(`[dupe_finder] Query "${query}" -> ${results.length} results`);
      return results;
    } catch (err) {
      console.error(`[dupe_finder] Query "${query}" FAILED: ${err.message}`);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);
  const perQueryCounts = allResults.map(r => r.length);
  console.log(`[dupe_finder] Per-query results: ${perQueryCounts.join(' + ')} = ${allResults.flat().length} total`);

  let candidates = allResults.flat();

  // Step 3: Dedupe all results
  candidates = deduplicateCandidates(candidates);

  // Debug: log all unique sources before filtering
  const allSources = [...new Set(candidates.map(c => c.source).filter(Boolean))];
  console.log('[dupe_finder] Sources from SerpAPI:', JSON.stringify(allSources));
  console.log('[dupe_finder] After dedup:', candidates.length);
  console.log('[dupe_finder] storeSet type:', typeof storeSet, 'isSet:', storeSet instanceof Set, storeSet ? `size=${storeSet.size}` : 'NULL');

  // Step 4: Filter on store whitelist
  let filtered = candidates.filter(c => isAllowedStore(c.source, storeSet));
  console.log(`[dupe_finder] After whitelist filter: ${filtered.length} of ${candidates.length}`);

  // Step 5: Fallback if too few
  if (filtered.length < 5) {
    const broadQuery = await generateBroadQuery(productInfo);
    console.log('[dupe_finder] Fallback query:', broadQuery);
    const fallback = await searchGoogleShopping(broadQuery, { num: 40, ...serpApiParams }).catch(() => []);
    const fallbackSources = [...new Set(fallback.map(r => r.source).filter(Boolean))];
    console.log('[dupe_finder] Fallback returned:', fallback.length, 'from sources:', JSON.stringify(fallbackSources));
    const additional = fallback
      .filter(c => isAllowedStore(c.source, storeSet))
      .filter(c => !filtered.some(f => (f.link || '').split('?')[0] === (c.link || '').split('?')[0]));
    console.log('[dupe_finder] Fallback whitelisted:', additional.length);
    filtered = [...filtered, ...deduplicateCandidates(additional)];
    console.log(`[dupe_finder] After fallback total: ${filtered.length}`);
  }

  return filtered;
}

export async function scoreDupes(originalProduct, candidates) {
  if (candidates.length === 0) return [];

  // Score top 25 candidates
  const toScore = candidates.slice(0, 25);

  const candidateList = toScore.map((c, i) =>
    `${i + 1}. "${c.title}" from ${c.source} at ${c.price}`
  ).join('\n');

  const original = `${originalProduct.brand || ''} ${originalProduct.product_name || ''} — ${originalProduct.category || ''}, ${originalProduct.color || ''}, ${originalProduct.material || ''}, features: ${(originalProduct.key_features || []).join(', ')}`;

  const result = await callClaude(
    `You are a fashion matching expert. Score how well each candidate matches the original luxury item.

Respond with ONLY a JSON array: [{"index": 1, "score": 85, "reason": "brief reason"}]

Scoring guide:
- 90-100: nearly identical in style, shape, material look
- 80-89: very similar silhouette and details
- 70-79: good alternative, same category and vibe
- 60-69: decent option, similar but noticeable differences
- 50-59: loosely related, same category
- Below 50: poor match

Be GENEROUS. A quilted crossbody bag IS a good match for a Chanel flap. A belted trench IS a match for Burberry. Focus on visual similarity and product type, not brand.`,
    [{
      role: 'user',
      content: `Original: ${original}\n\nCandidates:\n${candidateList}\n\nScore each candidate.`
    }]
  );

  // Collect all scored items
  const scored = [];
  for (const item of result) {
    const idx = item.index - 1;
    if (idx >= 0 && idx < toScore.length) {
      scored.push({
        ...toScore[idx],
        match_score: item.score,
        match_reason: item.reason || '',
      });
    }
  }

  scored.sort((a, b) => b.match_score - a.match_score);

  // Dynamic threshold: aim for 5-10 results
  let filtered = scored.filter(s => s.match_score >= 70);
  if (filtered.length < 5) filtered = scored.filter(s => s.match_score >= 60);
  if (filtered.length < 5) filtered = scored.filter(s => s.match_score >= 50);
  if (filtered.length < 5) filtered = scored.slice(0, Math.min(5, scored.length));

  return filtered.slice(0, 12);
}
