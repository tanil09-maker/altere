import { put } from '@vercel/blob';
import { identifyFromText, verifyOriginals } from '../lib/identify.js';
import { searchDupes, scoreDupes } from '../lib/dupe_finder.js';
import { getRegionConfig, getRegionStoreSet, getSerpApiParams } from '../lib/region.js';

const SEED_QUERIES = [
  { id: 1, query: "Bottega Veneta Cassette padded woven leather shoulder bag black", region: "EU" },
  { id: 2, query: "The Row Margaux 15 suede tote bag", region: "EU" },
  { id: 3, query: "Loewe Puzzle small bag black leather", region: "EU" },
  { id: 4, query: "Toteme Signature wool coat camel", region: "EU" },
  { id: 5, query: "The Row Bare flat sandal black leather", region: "EU" },
  { id: 6, query: "Khaite Elena cashmere ribbed tank top cream", region: "EU" },
  { id: 7, query: "Bottega Veneta Andiamo mini intrecciato bag", region: "EU" },
];

async function downloadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null; // skip tiny/broken images
    return buf;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.query.key !== process.env.SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = [];

  for (const item of SEED_QUERIES) {
    console.log(`[seed-dotd] Processing #${item.id}: ${item.query}`);
    try {
      // 1. Identify luxury originals
      const identified = await identifyFromText(item.query);
      if (!identified?.originals?.length) {
        console.log(`[seed-dotd] #${item.id}: no originals identified`);
        continue;
      }

      // 2. Verify original via SerpAPI
      const serpApiParams = getSerpApiParams(item.region, 'ES');
      const verified = await verifyOriginals(identified.originals.slice(0, 1), serpApiParams);
      const orig = verified[0];
      if (!orig) {
        console.log(`[seed-dotd] #${item.id}: verification failed`);
        continue;
      }

      // 3. Find dupes
      const storeSet = getRegionStoreSet(item.region);
      const productInfo = {
        brand: identified.originals[0].brand,
        product_name: identified.originals[0].product_name,
        category: identified.originals[0].category || 'bags',
        color: identified.originals[0].color || '',
        material: identified.originals[0].material || '',
        key_features: identified.key_features || [],
        dupe_search_hints: identified.dupe_search_hints || [],
      };

      const candidates = await searchDupes(productInfo, {
        storeSet,
        serpApiParams,
        keyAttributes: identified.key_attributes || {},
      });

      let dupes = candidates;
      if (candidates.length > 12) {
        dupes = await scoreDupes(productInfo, candidates);
      } else {
        dupes = candidates.map(c => ({ ...c, match_score: 75 }));
      }

      const bestDupe = dupes[0];
      if (!bestDupe) {
        console.log(`[seed-dotd] #${item.id}: no dupes found`);
        continue;
      }

      // 4. Download + upload images to Blob
      let origBlobUrl = '';
      let dupeBlobUrl = '';

      const origBuf = await downloadImage(orig.thumbnail);
      if (origBuf) {
        const blob = await put(`dotd/${item.id}-original.jpg`, origBuf, {
          access: 'public',
          contentType: 'image/jpeg',
          addRandomSuffix: true,
        });
        origBlobUrl = blob.url;
      }

      const dupeBuf = await downloadImage(bestDupe.thumbnail);
      if (dupeBuf) {
        const blob = await put(`dotd/${item.id}-dupe.jpg`, dupeBuf, {
          access: 'public',
          contentType: 'image/jpeg',
          addRandomSuffix: true,
        });
        dupeBlobUrl = blob.url;
      }

      // 5. Build item
      results.push({
        id: item.id,
        origBrand: (orig.brand || '').toUpperCase(),
        origName: orig.product_name || orig.title || '',
        origPrice: orig.extracted_price || 0,
        origImg: origBlobUrl || orig.thumbnail || '',
        origLink: orig.link || '',
        dupeBrand: (bestDupe.source || '').toUpperCase(),
        dupeName: bestDupe.title || '',
        dupePrice: bestDupe.extracted_price || 0,
        dupeImg: dupeBlobUrl || bestDupe.thumbnail || '',
        dupeLink: bestDupe.link || '',
        query: productInfo.product_name || item.query,
      });

      console.log(`[seed-dotd] #${item.id}: SUCCESS - ${orig.brand} vs ${bestDupe.source}`);
    } catch (err) {
      console.error(`[seed-dotd] #${item.id} FAILED:`, err.message);
    }
  }

  return res.status(200).json({
    success: true,
    seeded: results.length,
    DOTD_ITEMS: results,
  });
}
