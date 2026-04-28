// Dupe finding: generates search queries, searches SerpAPI, scores with Claude

import { searchGoogleShopping } from './serpapi.js';

const MODEL = 'claude-sonnet-4-20250514';

// STRICT whitelist — only these 13 stores, with regional variants
const ALLOWED_STORES = new Set([
  'zara', 'zara usa', 'zara uk', 'zara fr', 'zara de', 'zara nl', 'zara es', 'zara it', 'zara home',
  'h&m', 'hm', 'h and m', 'h&m usa', 'h&m uk', 'h&m home',
  'mango', 'mango usa', 'mango uk', 'mango outlet', 'mango man',
  'asos', 'asos com', 'asos us', 'asos uk',
  'cos', 'cos us', 'cos uk', 'cos com', 'cos stores',
  '& other stories', 'other stories', 'stories com',
  'massimo dutti',
  'uniqlo', 'uniqlo us', 'uniqlo uk',
  'pull&bear', 'pull and bear', 'pullandbear',
  'bershka',
  'stradivarius',
  'arket',
  'weekday',
]);

function normalizeStore(s) {
  if (!s) return '';
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.\-_,]/g, '');
}

function isAllowedStore(sourceText, storeSet) {
  if (!sourceText) return false;
  const allowed = storeSet || ALLOWED_STORES;
  const n = normalizeStore(sourceText);

  if (allowed.has(n)) return true;

  for (const store of allowed) {
    if (n === store || n.startsWith(store + ' ')) return true;
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

export async function generateDupeQueries(productInfo) {
  const hints = productInfo.dupe_search_hints || [];
  const name = productInfo.product_name || '';
  const features = productInfo.key_features || [];
  const category = productInfo.category || 'clothing';
  const color = productInfo.color || '';
  const material = productInfo.material || '';

  const queries = [...hints];

  // Generic style queries
  if (features.length > 0) {
    queries.push(`${features.slice(0, 3).join(' ')} ${category}`);
  }
  if (color && material) {
    queries.push(`${color} ${material} ${category} affordable`);
  }

  // Store-specific queries — target our whitelist stores directly
  const storeNames = ['zara', 'h&m', 'mango', 'asos', 'cos', 'uniqlo'];
  const shortDesc = features[0] || name.split(' ').slice(0, 3).join(' ') || category;
  for (const store of storeNames) {
    queries.push(`${store} ${shortDesc}`);
  }

  // Trending / broad
  queries.push(`designer inspired ${category} ${color}`.trim());
  queries.push(`${shortDesc} dupe affordable`);

  // Dedupe, lowercase, limit to 10
  const unique = [...new Set(queries.map(q => q.toLowerCase().trim()).filter(q => q.length > 3))];
  return unique.slice(0, 10);
}

export async function searchDupes(productInfo, regionOptions = {}) {
  const { storeSet, serpApiParams } = regionOptions;
  const queries = await generateDupeQueries(productInfo);
  const allCandidates = [];
  const seenLinks = new Set();

  for (const query of queries) {
    try {
      const results = await searchGoogleShopping(query, { num: 10, ...serpApiParams });
      for (const item of results) {
        if (!isAllowedStore(item.source, storeSet)) continue;

        // Dedupe by link
        const linkKey = (item.link || item.title || '').substring(0, 80);
        if (seenLinks.has(linkKey)) continue;
        seenLinks.add(linkKey);

        allCandidates.push(item);
      }
    } catch (err) {
      console.error(`[dupe_finder] SerpAPI error for "${query}":`, err.message);
    }
  }

  const deduplicated = deduplicateCandidates(allCandidates);
  console.log(`[dupe_finder] Found ${allCandidates.length} whitelisted, ${deduplicated.length} after dedup, from ${queries.length} queries`);
  return deduplicated;
}

export async function scoreDupes(originalProduct, candidates) {
  if (candidates.length === 0) return [];

  // Score top 20 candidates
  const toScore = candidates.slice(0, 20);

  const candidateList = toScore.map((c, i) =>
    `${i + 1}. "${c.title}" from ${c.source} at ${c.price}`
  ).join('\n');

  const original = `${originalProduct.brand} ${originalProduct.product_name} — ${originalProduct.category}, ${originalProduct.color || ''}, ${originalProduct.material || ''}, features: ${(originalProduct.key_features || []).join(', ')}`;

  const result = await callClaude(
    `You are a fashion matching expert. Score how well each candidate matches the original luxury item.

Respond with ONLY a JSON array: [{"index": 1, "score": 85, "reason": "brief reason"}]

Scoring guide:
- 90-100: nearly identical in style, shape, material look
- 80-89: very similar silhouette and details
- 70-79: good alternative, same category and vibe
- 60-69: decent option, similar but noticeable differences
- Below 60: poor match

Be generous but honest. A quilted crossbody bag IS a good match for a Chanel flap even if the brand is different. Focus on visual similarity, not brand prestige.`,
    [{
      role: 'user',
      content: `Original: ${original}\n\nCandidates:\n${candidateList}\n\nScore each candidate.`
    }]
  );

  // First pass: >= 60
  const scored = [];
  for (const item of result) {
    const idx = item.index - 1;
    if (idx >= 0 && idx < toScore.length && item.score >= 60) {
      scored.push({
        ...toScore[idx],
        match_score: item.score,
        match_reason: item.reason || '',
      });
    }
  }

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored.slice(0, 6);
}
