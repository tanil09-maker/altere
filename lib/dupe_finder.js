// Dupe finding: Claude generates generic queries, SerpAPI searches, Claude scores

import { searchGoogleShopping } from './serpapi.js';

const MODEL = 'claude-sonnet-4-20250514';

// Default whitelist (used when no regional override)
const DEFAULT_STORES = new Set([
  'zara', 'h&m', 'hm', 'mango', 'asos', 'cos',
  '& other stories', 'other stories', 'massimo dutti',
  'uniqlo', 'pull&bear', 'bershka', 'stradivarius', 'arket', 'weekday',
]);

let _whitelistDebugCount = 0;

function isAllowedStore(sourceText, allowedStoresList) {
  if (!sourceText || !allowedStoresList) return false;

  // Convert to array for iteration
  const stores = allowedStoresList instanceof Set
    ? [...allowedStoresList]
    : Array.isArray(allowedStoresList)
      ? allowedStoresList
      : [];

  if (stores.length === 0) {
    if (_whitelistDebugCount < 1) {
      console.error('[whitelist] EMPTY store list!');
      _whitelistDebugCount++;
    }
    return false;
  }

  // Normalize: lowercase, replace & and punctuation with spaces, collapse whitespace
  const src = String(sourceText).toLowerCase().replace(/[.,&\-_]/g, ' ').replace(/\s+/g, ' ').trim();

  for (const store of stores) {
    if (!store) continue;
    const s = String(store).toLowerCase().replace(/[.,&\-_]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) continue;

    // Exact match
    if (src === s) return true;
    // Starts/ends/contains with space boundaries
    if (src.startsWith(s + ' ')) return true;
    if (src.endsWith(' ' + s)) return true;
    if (src.includes(' ' + s + ' ')) return true;
    // Substring match for store names 3+ chars (catches "Zara ES", "COS España", etc)
    if (s.length >= 3 && src.includes(s)) return true;
    // Slug match (no spaces): "hm" in "hm.com", "cos" in "cosstores"
    const slug = s.replace(/\s+/g, '');
    if (slug.length >= 2 && src.replace(/\s+/g, '').includes(slug)) return true;
  }

  if (_whitelistDebugCount < 10) {
    console.log(`[whitelist] REJECTED: "${sourceText}" (normalized: "${src}")`);
    _whitelistDebugCount++;
  }
  return false;
}

function deduplicateCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  const seen = new Set();
  const result = [];

  for (const c of candidates) {
    if (!c) continue;

    // Use product_id or position+title as key (NOT link — SerpAPI links are all google.com redirects)
    let key;
    if (c.product_id) {
      key = `pid:${c.product_id}`;
    } else {
      // Combine title + source + price as fingerprint
      key = `${(c.title || '').toLowerCase().slice(0, 60)}|${(c.source || '').toLowerCase()}|${c.extracted_price || ''}`;
    }

    if (!key || key === '||') { result.push(c); continue; }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }

  console.log(`[dedup] ${candidates.length} -> ${result.length}`);
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

// Claude generates color-aware generic product queries (no brand names)
async function generateDupeQueries(productInfo, keyAttributes = {}) {
  const brand = productInfo.brand || '';
  const name = productInfo.product_name || '';
  const category = productInfo.category || 'clothing';
  const features = (productInfo.key_features || []).join(', ');
  const color = keyAttributes.color || productInfo.color || '';

  const colorRule = color
    ? `\nMANDATORY: Every query MUST include the color "${color}" or a synonym. This is non-negotiable.`
    : '';

  try {
    const result = await callClaude(
      `You generate Google Shopping search queries for finding affordable alternatives to luxury fashion items.

CRITICAL RULES:
- NO luxury brand names (no Chanel, Burberry, Bottega, Hermes, etc.)
- NO words like "dupe", "alternative", "inspired", "replica", "lookalike"
- ONLY: color + product type + visual features
- Keep each query under 6 words
- Make queries DIVERSE${colorRule}

Return JSON: { "queries": ["query1", "query2", "query3", "query4"] }`,
      [{
        role: 'user',
        content: `Luxury item: ${brand} ${name}\nCategory: ${category}\nColor: ${color}\nFeatures: ${features}\n\nGenerate 4 queries.`
      }]
    );
    return result.queries || [];
  } catch (err) {
    console.error('[dupe_finder] Query generation failed:', err.message);
    const fallback = [];
    if (color && category) fallback.push(`${color} ${category}`);
    if (features) fallback.push(`${color} ${features.split(',')[0]?.trim()} ${category}`.trim());
    fallback.push(`${color} ${category}`.trim());
    return fallback.filter(Boolean);
  }
}

// Broad fallback — always includes color if available
function buildBroadFallbackQuery(productInfo, keyAttributes = {}) {
  const color = keyAttributes.color || productInfo.color || '';
  const cat = (productInfo.category || 'fashion').toLowerCase().replace(/^(women's |men's )/, '');
  return color ? `${color} ${cat}` : cat;
}

// Color synonyms for soft filtering
const COLOR_SYNONYMS = {
  'red': ['red', 'rojo', 'rouge', 'crimson', 'scarlet', 'burgundy', 'wine', 'cherry', 'cardinal', 'rust', 'maroon'],
  'black': ['black', 'negro', 'noir', 'jet', 'onyx', 'ebony'],
  'white': ['white', 'blanco', 'ivory', 'cream', 'off-white', 'pearl', 'ecru'],
  'beige': ['beige', 'camel', 'tan', 'nude', 'taupe', 'sand', 'khaki', 'oatmeal'],
  'blue': ['blue', 'azul', 'navy', 'cobalt', 'royal', 'denim', 'indigo', 'sapphire'],
  'green': ['green', 'verde', 'olive', 'forest', 'emerald', 'sage', 'mint', 'khaki'],
  'pink': ['pink', 'rosa', 'blush', 'rose', 'fuchsia', 'magenta', 'coral'],
  'yellow': ['yellow', 'mustard', 'gold', 'butter', 'lemon'],
  'brown': ['brown', 'chocolate', 'cocoa', 'mocha', 'walnut', 'chestnut', 'espresso'],
  'grey': ['grey', 'gray', 'charcoal', 'silver', 'slate', 'graphite'],
  'purple': ['purple', 'violet', 'lavender', 'lilac', 'plum', 'amethyst'],
  'orange': ['orange', 'rust', 'amber', 'terracotta', 'coral', 'tangerine'],
};

function getColorTerms(color) {
  if (!color) return [];
  const key = color.toLowerCase().trim();
  return COLOR_SYNONYMS[key] || [key];
}

export async function searchDupes(productInfo, regionOptions = {}) {
  const { storeSet, serpApiParams, keyAttributes = {} } = regionOptions;

  _whitelistDebugCount = 0;
  console.log('[dupe_finder] storeSet size:', storeSet?.size || 0, 'color:', keyAttributes.color || 'none');
  console.log('[dupe_finder] serpApiParams:', JSON.stringify(serpApiParams));

  // Step 1: Generate color-aware queries via Claude
  const queries = await generateDupeQueries(productInfo, keyAttributes);
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

  // Step 3: ALWAYS run broad fallback (includes color)
  const broadQuery = buildBroadFallbackQuery(productInfo, keyAttributes);
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

  // Step 5: Color soft filter — prioritize color matches
  const targetColor = keyAttributes.color || productInfo.color || '';
  if (targetColor) {
    const colorTerms = getColorTerms(targetColor);
    const withColor = [];
    const withoutColor = [];

    for (const item of filtered) {
      const text = (item.title || '').toLowerCase();
      const hasColor = colorTerms.some(t => text.includes(t));
      if (hasColor) withColor.push(item);
      else withoutColor.push(item);
    }

    console.log(`[dupe_finder] Color "${targetColor}": ${withColor.length} match, ${withoutColor.length} don't`);

    // If we have >=3 color matches, return only those
    if (withColor.length >= 3) {
      filtered = withColor;
    } else {
      // Color matches first, then others
      filtered = [...withColor, ...withoutColor];
    }
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
