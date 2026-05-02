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

function isAllowedStore(sourceText, storeSet) {
  if (!sourceText) return false;
  const allowed = storeSet || DEFAULT_STORES;
  const n = normalizeStore(sourceText);

  if (allowed.has(n)) return true;

  for (const store of allowed) {
    const s = store.toLowerCase().trim();
    if (n.startsWith(s + ' ')) return true;
    if (n.endsWith(' ' + s)) return true;
    try {
      if (new RegExp(`\\b${escapeRegex(s)}\\b`).test(n)) return true;
    } catch { /* skip */ }
    const slug = s.replace(/[&\s]/g, '');
    if (n.includes(slug + 'com') || n.includes(slug + 'stores')) return true;
  }

  return false;
}

// Link-only dedup (no title-based dedup — too aggressive)
function deduplicateCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const c of candidates) {
    const key = (c.link || '').split('?')[0].toLowerCase();
    if (!key) { result.push(c); continue; }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
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
    const fallback = [];
    if (features) fallback.push(`${category} ${features.split(',')[0]?.trim()}`);
    if (color) fallback.push(`${color} ${category}`);
    fallback.push(category);
    return fallback;
  }
}

// Broad fallback query
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

  console.log('[dupe_finder] serpApiParams:', JSON.stringify(serpApiParams));

  // Step 1: Generate generic queries via Claude
  const queries = await generateDupeQueries(productInfo);
  console.log(`[dupe_finder] Generated ${queries.length} queries:`, JSON.stringify(queries));

  // Step 2: Run ALL queries in parallel
  const searchPromises = queries.map(async (query, idx) => {
    try {
      const results = await searchGoogleShopping(query, { num: 30, ...serpApiParams });
      console.log(`[dupe_finder] Query ${idx + 1} "${query}" -> ${results.length} results`);
      return results;
    } catch (err) {
      console.error(`[dupe_finder] Query ${idx + 1} "${query}" FAILED: ${err.message}`);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);
  console.log(`[dupe_finder] Per-query: ${allResults.map(r => r.length).join(' + ')} = ${allResults.flat().length}`);

  let candidates = deduplicateCandidates(allResults.flat());
  let filtered = candidates.filter(c => isAllowedStore(c.source, storeSet));
  console.log(`[dupe_finder] Main queries: ${candidates.length} deduped -> ${filtered.length} whitelisted`);

  // Step 3: ALWAYS run broad fallback to expand results
  const broadQuery = await generateBroadQuery(productInfo);
  console.log('[dupe_finder] Broad fallback query:', broadQuery);

  const fallback = await searchGoogleShopping(broadQuery, { num: 60, ...serpApiParams }).catch(() => []);
  const fallbackFiltered = fallback.filter(c => isAllowedStore(c.source, storeSet));
  console.log(`[dupe_finder] Fallback: ${fallback.length} total -> ${fallbackFiltered.length} whitelisted`);

  // Merge main + fallback, dedup by link
  filtered = deduplicateCandidates([...filtered, ...fallbackFiltered]);
  console.log(`[dupe_finder] After merge: ${filtered.length}`);

  // Step 4: ULTRA broad fallback if still under 5
  if (filtered.length < 5) {
    const ultraQuery = productInfo.category || 'fashion';
    console.log('[dupe_finder] Ultra fallback:', ultraQuery);
    const ultra = await searchGoogleShopping(ultraQuery, { num: 60, ...serpApiParams }).catch(() => []);
    const ultraFiltered = ultra.filter(c => isAllowedStore(c.source, storeSet));
    console.log(`[dupe_finder] Ultra: ${ultra.length} -> ${ultraFiltered.length} whitelisted`);
    filtered = deduplicateCandidates([...filtered, ...ultraFiltered]);
  }

  console.log(`[dupe_finder] FINAL: returning ${Math.min(filtered.length, 12)} dupes`);
  return filtered.slice(0, 12);
}

export async function scoreDupes(originalProduct, candidates) {
  if (!candidates || candidates.length === 0) {
    console.log('[scoreDupes] No candidates');
    return [];
  }

  console.log(`[scoreDupes] Input: ${candidates.length} candidates`);

  // If 12 or fewer, skip Claude scoring — just return all
  if (candidates.length <= 12) {
    console.log('[scoreDupes] <= 12 items, returning all with score 75');
    return candidates.map(c => ({ ...c, match_score: 75 }));
  }

  // Only score with Claude when we have abundance (>12)
  const toScore = candidates.slice(0, 25);
  const candidateList = toScore.map((c, i) =>
    `${i + 1}. "${c.title}" from ${c.source} at ${c.price}`
  ).join('\n');

  const original = `${originalProduct.brand || ''} ${originalProduct.product_name || ''} — ${originalProduct.category || ''}, ${originalProduct.color || ''}, features: ${(originalProduct.key_features || []).join(', ')}`;

  let claudeScores;
  try {
    claudeScores = await callClaude(
      `Score how well each candidate matches the original luxury item. Respond with ONLY a JSON array: [{"index": 1, "score": 85}]. Score ALL candidates. Be GENEROUS — same product type = minimum 60.`,
      [{ role: 'user', content: `Original: ${original}\n\nCandidates:\n${candidateList}\n\nScore all ${toScore.length}.` }]
    );
  } catch (err) {
    console.error('[scoreDupes] Claude failed:', err.message);
    return candidates.slice(0, 12).map(c => ({ ...c, match_score: 70 }));
  }

  // Map scores back — never lose items
  const scoredIndexes = new Set();
  const scored = [];

  for (const item of claudeScores) {
    const idx = (item.index || 0) - 1;
    if (idx >= 0 && idx < toScore.length) {
      scoredIndexes.add(idx);
      scored.push({ ...toScore[idx], match_score: item.score || 65 });
    }
  }

  // Add back unscored items with default
  for (let i = 0; i < toScore.length; i++) {
    if (!scoredIndexes.has(i)) {
      scored.push({ ...toScore[i], match_score: 65 });
    }
  }

  scored.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  console.log(`[scoreDupes] Returning top 12 of ${scored.length}`);
  return scored.slice(0, 12);
}
