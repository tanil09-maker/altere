import { createHash } from 'node:crypto';

// Hash full image bytes (including case), intent and locale. Never reuse an
// unrelated photo result just because encoded image headers share a prefix.
export function searchCacheKey({ query = '', url = '', imageData = null, mediaType = 'image/jpeg', inputType = 'text', intent = 'identify_and_dupes', region = '', countryCode = null }) {
  return 'v2_' + createHash('sha256').update(JSON.stringify({
    query, url, imageData, mediaType, inputType, intent, region, countryCode,
  })).digest('hex');
}
