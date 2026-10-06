import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCacheKey } from '../lib/search-key.js';
import { scoreDupes } from '../lib/dupe_finder.js';
import { identifyFromImage, verifyOriginals } from '../lib/identify.js';

await test('photo cache differentiates full payload, letter case, intent and country', () => {
  const input = {inputType: 'image', imageData: 'A'.repeat(100) + 'abc', region: 'EU', countryCode: 'NL'};
  for (const changes of [{imageData: 'A'.repeat(100) + 'abd'}, {imageData: 'A'.repeat(100) + 'ABC'}, {intent: 'dupes_only'}, {countryCode: 'ES'}]) {
    assert.notEqual(searchCacheKey(input), searchCacheKey({...input, ...changes}));
  }
  assert.equal(searchCacheKey(input), searchCacheKey({...input}));
});
await test('small result sets never receive fabricated match scores', async () => {
  const result = await scoreDupes({}, [{title:'Black bag',link:'https://shop.example/bag'}]);
  assert.equal(result[0].match_score, null);
  assert.equal(result[0].link, 'https://shop.example/bag');
});
await test('scoring failure preserves listings without inventing percentages', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => {throw new Error('test service unavailable')};
  try {
    const results = await scoreDupes({}, Array.from({length:13}, (_,i)=>({title:`Bag ${i}`})));
    assert.equal(results.length,12);
    assert.ok(results.every(r=>r.match_score===null));
  } finally {globalThis.fetch=old;}
});
await test('image identification forwards the image without forcing luxury brands', async () => {
  const old=globalThis.fetch; process.env.ANTHROPIC_API_KEY='test-only';
  globalThis.fetch=async (url, options)=>{
    const body=JSON.parse(options.body);
    assert.equal(body.messages[0].content[0].source.data,'sample-image');
    assert.ok(body.system.includes('Never force a luxury brand'));
    return {ok:true,json:async()=>({content:[{type:'text',text:'{"originals":[],"key_features":[]}'}]})};
  };
  try {await identifyFromImage('sample-image');} finally {globalThis.fetch=old;delete process.env.ANTHROPIC_API_KEY;}
});
await test('shopping cards use actual listing titles and discard unfound guesses', async () => {
  const old=globalThis.fetch;process.env.SERPAPI_KEY='test-only';
  globalThis.fetch=async()=>({ok:true,json:async()=>({shopping_results:[{title:'Actual shop title',link:'https://shop.example/item',price:'€25',extracted_price:25,source:'Shop'}]})});
  try {
    const results=await verifyOriginals([{search_query:'bag',brand:'Guessed',product_name:'Invented',category:'bags'}]);
    assert.equal(results[0].product_name,'Actual shop title');
    assert.equal(results[0].brand,'');
    assert.equal(results[0].match_type,'candidate');
    globalThis.fetch=async()=>({ok:true,json:async()=>({shopping_results:[]})});
    assert.deepEqual(await verifyOriginals([{search_query:'bag'}]),[]);
  } finally {globalThis.fetch=old;delete process.env.SERPAPI_KEY;}
});
