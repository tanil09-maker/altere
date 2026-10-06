# ALTERE — search trust and photo-flow upgrade

This is a candidate upgrade of the existing project, based on commit
c2eed664bacf8422755e024753b2e70d5291f4da. It has NOT been deployed.

## Changes

- Open the existing photo-upload panel by default and improve control contrast/focus.
- Remove forced luxury identification; describe uncertain items without invented brands.
- Show actual shopping listing titles as possible matches, not verified originals.
- Remove fabricated fallback match percentages and unsupported savings comparisons.
- Preserve source price text, add safe product-listing links and save them with favourites.
- Use an explicit image-unavailable placeholder rather than an unrelated fashion photo.
- Hide static demonstration products, the unverified daily deal, the fixed-rate savings
  calculator and material/savings filters until supporting data is available.
- Correct free-search explanations, add a working privacy information dialog and
  validate upload type/size. Revised copy is English/Dutch, with English fallback for
  other languages until those revisions are translated.
- Hash full image inputs, intent and country in search cache keys; distinguish otherwise
  identical image headers and different search modes. Always analyse image/link input
  when searching alternatives.

## Validation

- `npm test`: five passing mocked backend regression tests.
- Syntax checks and `git diff --check`: passed.
- Local DOM smoke test with mocked search/auth/region: passed initialization, photo
  default, FAQ, preferences dialog, listing links, fallback image and saved price/link.
- Local browser preview timed out: responsive visual review remains outstanding.
- Real AI/search provider integration, camera/upload end-to-end and Google sign-in
  on the preview deployment remain unverified. Existing auth configuration is unchanged.

## Release

Create a feature branch from the current main branch. Review these changes before
merging, and verify Vercel's preview with existing environment variables. Do not replace
production solely on the basis of mocked tests. GitHub's connector rejected creation
of the review branch contents with HTTP 403 (resource not accessible by integration).

## Follow-up work

Account-synced favourites, complete privacy/terms pages, remaining footer links,
fully translated revised UI copy, calibrated image matching and fresh product data
are not part of this first patch. Existing favourites remain local to the browser.
