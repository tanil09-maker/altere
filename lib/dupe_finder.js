// Dupe finding: generates search queries, searches SerpAPI, scores with Claude

import { searchGoogleShopping } from './serpapi.js';

const MODEL = 'claude-sonnet-4-20250514';

// High-street stores we search for dupes — broad matching
const DUPE_STORE_PATTERNS = [
  'zara', 'h&m', 'h & m', 'hm.com', 'hm ', 'mango', 'asos',
  'cos', 'cosstores', '& other stories', 'other stories', 'otherstories',
  'massimo dutti', 'massimodutti', 'uniqlo', 'pull&bear', 'pull and bear',
  'pullandbear', 'bershka', 'stradivarius', 'arket', 'weekday',
  'reserved', 'primark', 'new look', 'topshop', 'river island',
  'boohoo', 'pretty little thing', 'plt', 'shein', 'na-kd', 'nakd',
  'monki', 'warehouse', 'oasis', 'dorothy perkins', 'next.co',
  'target', 'old navy', 'gap', 'forever 21', 'urban outfitters',
];

function isHighStreetStore(source) {
  const s = (source || '').toLowerCase();
  return DUPE_STORE_PATTERNS.some(pattern => s.includes(pattern));
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
  // Use the hints from identification + generate additional queries
  const hints = productInfo.dupe_search_hints || [];
  const base = productInfo.key_features?.join(' ') || productInfo.product_name || '';
  const category = productInfo.category || 'clothing';

  // Combine Claude's hints with feature-based queries
  const queries = [...hints];
  if (base && queries.length < 4) {
    queries.push(`${base} ${category} affordable`);
  }
  if (productInfo.color && productInfo.material) {
    queries.push(`${productInfo.color} ${productInfo.material} ${category}`);
  }

  // Dedupe and limit
  const unique = [...new Set(queries.map(q => q.toLowerCase()))].slice(0, 5);
  return unique;
}

export async function searchDupes(productInfo) {
  const queries = await generateDupeQueries(productInfo);
  const allCandidates = [];
  const seenTitles = new Set();

  // Search each query on Google Shopping
  for (const query of queries) {
    try {
      const results = await searchGoogleShopping(query, { num: 20 });
      for (const item of results) {
        // Only keep high-street store results
        if (!isHighStreetStore(item.source)) {
          continue;
        }
        // Dedupe by title similarity
        const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
        if (seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);
        allCandidates.push(item);
      }
    } catch (err) {
      console.error(`[dupe_finder] SerpAPI error for "${query}":`, err.message);
    }
  }

  // If too few high-street results, try broader category search
  if (allCandidates.length < 5) {
    const category = productInfo.category || 'bag';
    const color = productInfo.color || '';
    const broadQueries = [
      `${color} ${category} under $100`,
      `affordable ${category} ${productInfo.key_features?.[0] || ''}`,
    ];
    for (const query of broadQueries) {
      try {
        const results = await searchGoogleShopping(query.trim(), { num: 20 });
        for (const item of results) {
          if (!isHighStreetStore(item.source)) continue;
          const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
          if (seenTitles.has(titleKey)) continue;
          seenTitles.add(titleKey);
          allCandidates.push(item);
        }
      } catch { /* continue */ }
    }
  }

  console.log(`[dupe_finder] Found ${allCandidates.length} high-street candidates`);
  return allCandidates;
}

export async function scoreDupes(originalProduct, candidates) {
  if (candidates.length === 0) return [];

  // Take top 15 candidates to score (limit Claude token usage)
  const toScore = candidates.slice(0, 15);

  const candidateList = toScore.map((c, i) =>
    `${i + 1}. "${c.title}" from ${c.source} at ${c.price}`
  ).join('\n');

  const original = `${originalProduct.brand} ${originalProduct.product_name} — ${originalProduct.category}, ${originalProduct.color || ''}, ${originalProduct.material || ''}, features: ${(originalProduct.key_features || []).join(', ')}`;

  const result = await callClaude(
    `You are a fashion matching expert. Score how well each candidate product matches the original luxury item. Respond with ONLY a JSON array of objects: [{"index": 1, "score": 85, "reason": "brief reason"}]. Score 0-100 where: 90+ = nearly identical style, 80-89 = very similar, 70-79 = good alternative, below 70 = poor match. Be strict — only high scores for genuinely similar items.`,
    [{
      role: 'user',
      content: `Original: ${original}\n\nCandidates:\n${candidateList}\n\nScore each candidate's match quality to the original.`
    }]
  );

  // Merge scores back into candidates
  const scored = [];
  for (const item of result) {
    const idx = item.index - 1;
    if (idx >= 0 && idx < toScore.length && item.score >= 70) {
      scored.push({
        ...toScore[idx],
        match_score: item.score,
        match_reason: item.reason || '',
      });
    }
  }

  // Sort by score descending, take top 6
  scored.sort((a, b) => b.match_score - a.match_score);
  return scored.slice(0, 6);
}
