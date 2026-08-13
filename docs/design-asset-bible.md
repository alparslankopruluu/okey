# Luma Okey design and asset bible

## Provenance and rights boundary

- **Generated:** 2026-08-11 with the built-in OpenAI/ChatGPT image generation tool.
- **Input:** text prompts below. The eight user-supplied screenshots were reviewed only to extract generic qualities (airy hierarchy, pastel-neon light, soft-clay objects, rounded/glass-like surfaces, aqua emphasis). They were not passed into the generation calls and are not bundled.
- **Origin:** generated output, not a stock library or copied game asset. Use is governed by the operator's applicable OpenAI terms; uniqueness, trademark, and final store/legal clearance are not guaranteed.
- **Release check:** visually review every selected/cropped output for accidental marks, third-party resemblance, age appropriateness, and small-size behavior before shipping. Replace any disputed element.
- **Gameplay rule:** tile numbers, colors, indicator/joker marks, turn state, scores, and actionable icons are deterministic Skia/SVG/text. AI raster output never decides or depicts gameplay-critical glyphs.
- **Rack rule:** values `10`–`13` always render horizontally on one line. The player hand sits on two visible shelves (Classic 8+7 or 8+8; 101 11+11); narrow 101 layouts scroll the complete rack instead of stacking digits or crushing tap targets.

## Visual anchor

- Personality: luminous calm, tactile, sociable.
- Light theme: pearl ivory, mist blue, translucent aqua, soft charcoal text.
- Dark theme: midnight ink, deep indigo, aqua focus, lilac depth, small coral warmth.
- Materials: satin ceramic tiles, soft-touch polymer racks, fine felt, frosted glass, restrained pearlescent metal.
- Motion: short tactile springs and clear arcs; deal, daily bonus, legal finish, and cosmetic equip are the only richer delight moments.
- Avoid: green casino felt, gold overload, currency/cash cues, slot/poker imagery, noisy HUDs, photorealistic avatars, branded rooms, or copied trade dress.

## Generated source sets

| Set | Source file | SHA-256 | Selection |
|---|---|---|---|
| Master style frame | `assets/concepts/01-master-style-frame.png` | `6080c34007909e7b2606969adfb89ab58f1514caf89d61b76891e3f269fbd5b9` | Primary art-direction anchor; table silhouette, palette, rim light, quiet hierarchy |
| Light/dark environments | `assets/concepts/02-light-dark-environments.png` | `32147837bb3b06cd263eeb03406f0a27598d26afca23f85f9ae7f28bea8ff811` | Same-product theme pair; runtime crops selected as `room-light.png` and `room-dark.png` |
| Tiles/racks/materials | `assets/concepts/03-tiles-racks-materials.png` | `f3c13bddd2f5016c444861e63eb33a98ce3e0bf7b865f80e9e7658f350fe8045` | Two-tier dark rack with aqua inlay, ivory satin blank, fine-felt direction |
| Avatar medallions | `assets/concepts/04-avatar-medallions.png` | `d0942898a7f2772bd2c44d6751eb12011f34167d75fb993b9615349461c8e8a7` | Cohesive adult set with clear thumbnail silhouettes; 12 local crops selected |
| Economy/rewards/cosmetics | `assets/concepts/05-economy-rewards-cosmetics.png` | `5c37ef3c041347a670305e3c78a79974d38d9965be8da17824c34d1efbc506ac` | Seven-day orb path, abstract premium halo, gift, and table charms without cash cues |

All source images are 1672×941 PNG. `assets/game/` contains selected references and crops; they are candidates, not proof that a final UI or store asset shipped.

## Exact generation prompts

### 1. Master style frame

```text
Use case: stylized-concept
Asset type: mobile game master style-frame concept art
Primary request: an original premium four-player Turkish Okey table for a mobile game called Luma Okey, shown during an active relaxed evening match
Scene/backdrop: floating oval tabletop in a serene abstract lounge, deep midnight indigo fading to soft violet, sparse tiny light motes, no architecture that resembles a real venue
Subject: four distinct soft-clay avatar medallions around the table, one readable ivory tile rack in the foreground, a central tile wall and one discard lane, active-player aqua halo
Style/medium: polished soft 3D / clay-like game concept render with restrained glass UI material, refined consumer-app visual language, original design
Composition/framing: wide 16:9 landscape master frame, slight top-down three-quarter camera, generous safe margins for responsive mobile cropping, focal table centered
Lighting/mood: calm luminous evening, aqua key light with lilac and coral rim accents, soft shadows, subtle pearlescent highlights
Color palette: midnight ink, pearl ivory, mist blue, aqua, lilac, small coral accents
Materials/textures: frosted glass, satin ceramic tiles, soft-touch polymer rack, fine felt table surface
Constraints: no text, no numbers or tile symbols, no logos, no brands, no trademarks, no currency symbols, no casino imagery, no green casino felt, no photorealistic people, no copied characters, no watermark; maintain excellent object silhouettes and tile readability; keep the interface visually quiet
```

### 2. Light/dark room pair

```text
Use case: stylized-concept
Asset type: game environment concept sheet
Primary request: two original Luma Okey mobile table environments shown side by side as a cohesive light-theme and dark-theme pair
Scene/backdrop: left environment is an airy pearl morning lounge with abstract soft-cloud forms and mist-blue depth; right environment is a quiet midnight indigo lounge with sparse luminous particles and violet depth; neither is a real branded venue
Subject: the same empty four-seat oval Okey table in both halves, seen from the same slight top-down three-quarter camera, with four simple racks and a central tile wall but no characters
Style/medium: polished soft 3D consumer game environment concept render, clay-like geometry, frosted glass accents, premium and minimal
Composition/framing: 16:9 landscape split concept sheet, equal halves, identical geometry/camera, generous safe margins, clear material comparison
Lighting/mood: left soft diffuse daylight with aqua edge light; right calm evening light with aqua and lilac rim light
Color palette: pearl ivory, mist blue, aqua, midnight ink, lilac, tiny coral warmth
Materials/textures: fine felt, satin ceramic, frosted glass, soft-touch polymer, subtle pearlescent metal
Constraints: no text, no labels, no logos, no brands, no trademarks, no casino imagery, no green casino felt, no currency, no people, no copied environments, no watermark; quiet composition; excellent foreground/background separation; both halves must feel like the same original product
```

### 3. Tile/rack/material sheet

```text
Use case: stylized-concept
Asset type: game prop and material concept sheet
Primary request: an original Luma Okey product-design sheet exploring tactile tile blanks, two-tier racks, table felt, and indicator tokens for a premium mobile game
Scene/backdrop: neutral pearl-to-mist studio gradient with soft aqua edge glow
Subject: three rack variations arranged cleanly, groups of blank ivory tile pieces shown front/side/back, one false-joker material marker without any symbol, felt swatches, and small exploded-view material layers
Style/medium: polished soft 3D industrial-design concept render, clay-like yet precise, mobile-game production reference
Composition/framing: 16:9 landscape catalog sheet, orderly grid with ample spacing, multiple three-quarter and side views, clear silhouette hierarchy
Lighting/mood: soft product studio lighting, calm and premium
Color palette: pearl ivory, midnight ink, mist blue, aqua, lilac, tiny coral accent
Materials/textures: satin ceramic tile faces, softly rounded edges, subtle translucent aqua inlay channels, soft-touch dark polymer racks, fine micro-felt
Constraints: absolutely no text, no letters, no numbers, no tile symbols, no labels, no logos, no brands, no trademarks, no casino imagery, no currency, no watermark; tile glyphs will be drawn deterministically in code; proportions must look ergonomic and consistent; no excessive reflections
```

### 4. Avatar medallions

```text
Use case: stylized-concept
Asset type: game avatar medallion concept sheet
Primary request: twelve original adult avatar medallions for Luma Okey, friendly Turkish and international social-tabletop players with varied ages, skin tones, hair textures, facial hair, glasses, and personal style
Scene/backdrop: clean midnight-to-mist gradient concept-sheet backdrop
Subject: twelve distinct head-and-shoulder soft-clay characters, each inside the same circular frosted medallion frame; warm natural expressions, mature adult appearance, no celebrity likenesses
Style/medium: polished soft 3D clay character renders for a premium mobile game, simplified shapes, strong thumbnail silhouettes, cohesive art direction
Composition/framing: 16:9 landscape, exact 4-by-3 grid, equal scale, generous spacing, face-forward or slight three-quarter poses
Lighting/mood: soft studio key light, aqua/lilac rim glow, approachable and calm
Color palette: varied clothing in aqua, indigo, lilac, pearl, muted coral; consistent midnight/pearl frames
Constraints: no text, no names, no numbers, no logos, no brands, no trademarks, no national flags, no uniforms, no casino imagery, no children, no copied characters, no watermark; each character must be clearly distinct and suitable for small circular mobile display; balanced representation without stereotypes
```

### 5. Economy/reward/cosmetic sheet

```text
Use case: stylized-concept
Asset type: mobile game economy and reward object concept sheet
Primary request: original Luma Okey visual objects for chip balance, seven-day daily bonus, VIP cosmetic status, and collectible table cosmetics without implying cash or gambling
Scene/backdrop: clean midnight-to-pearl studio gradient with subtle frosted panels and generous empty margins
Subject: satin ceramic chip stacks in seven color accents, a seven-step floating reward path made of small luminous orbs, one premium crown-like abstract halo object, one gift capsule, three tabletop cosmetic charms, and a restrained celebratory particle cluster
Style/medium: polished soft 3D/clay mobile game UI objects, cohesive premium consumer-app art direction, strong small-size silhouettes
Composition/framing: 16:9 landscape catalog sheet, organized groups with ample spacing, centered three-quarter product views
Lighting/mood: calm studio glow, aqua key light, lilac and coral highlights, joyful but not casino-like
Color palette: pearl ivory, midnight ink, aqua, lilac, muted coral, mist blue, small warm gold accent only on premium halo
Materials/textures: satin ceramic, frosted glass, soft translucent resin, subtle pearlescent edges
Constraints: no text, no letters, no numbers, no currency symbols, no poker chips, no playing cards, no slot-machine imagery, no coins resembling real money, no gambling cues, no logos, no brands, no trademarks, no copied objects, no watermark; VIP object must read as cosmetic prestige only, not gameplay power
```

## Production translation rules

1. Sample colors/materials from the concepts into semantic tokens; do not ship a screenshot as UI chrome.
2. Use deterministic Skia geometry for table, tiles, racks, shadows, focus halo, discard arcs, and all rule state.
3. Avatar crops may ship as bundled cosmetic images after small-size/device review; provide descriptive accessibility labels and never infer real identity/ethnicity.
4. Economy art may inspire code-drawn counters and one bonus illustration; never depict cash, odds, winnings, or gameplay power.
5. Keep source originals immutable. Any edit becomes a new filename with its tool, prompt/change, date, and hash recorded here.

## Development icon derivative

- File: `assets/game/app-icon-dev.png`
- Date: 2026-08-11
- Tool/change: ImageMagick; avatar crop 01 was resized proportionally, centered, and padded to an opaque 1024 x 1024 midnight canvas.
- SHA-256: `4e12abe624cc08698e9c97d821254ae6862f3a5f52fea4dcd99a9d416beeaa26`
- Purpose: deterministic development-build placeholder only. Store icon art remains a human-reviewed release TODO.

## 2026-08-12 production asset pass

The built-in ChatGPT Images generator received only Luma's owned concept sheets as
material-language references. Each source render used an explicit empty-background,
no-text/no-logo/no-currency constraint. Chroma-key removal used the app-factory
`remove_chroma_key.py` helper with a soft matte and despill; originals remain under
`assets/concepts/generated/`.

| Asset | Final file | SHA-256 | Selection rationale |
|---|---|---|---|
| Empty two-tier rack | `assets/game/racks/luma-rack-v1.png` | `c7c53998e712b9ebc1b050a5b6b4187ed90a8026817ff604607c1296d817b56e` | Uniform wide center, two distinct shelves, quiet midnight/aqua material, no gameplay glyphs |
| Tea gift · 50 chip | `assets/game/gifts/gift-tea-v1.png` | `e870d0595ef31684fbe4aec72409ce6a0e82de230750903a1c8dc1be8541f99d` | Recognizable Turkish tulip glass, warm but non-monetary |
| Coffee gift · 100 chip | `assets/game/gifts/gift-coffee-v1.png` | `b084cacd243a8410c59ef25503839b2fdd54c115aca01e7572616d672ceb62a3` | Distinct pearl cup silhouette, compact mobile readability |
| Chocolate gift · 150 chip | `assets/game/gifts/gift-chocolate-v1.png` | `25367bc28439fc8cc0c601f21030dcf7e11a6dbf61e5d56c5ec4333051e1e6c8` | Three-piece assortment and lilac wrap separate it from other gifts |
| Rose gift · 250 chip | `assets/game/gifts/gift-rose-v1.png` | `7ee5f9f8388c71f967d197bd59ac8754b83825dbd64667d638937eeae5a9c725` | Strong coral bloom silhouette and Luma-colored stem/leaves |
| Amber tespih gift · 400 chip | `assets/game/gifts/gift-tespih-v1.png` | `4c854b3098c65c5a11306c428dfb8c438e9712b704a2369041260770bc0feb7a` | Respectful bead-loop presentation, no text or religious marking |
| Celebration cake · 1,000 chip | `assets/game/gifts/gift-cake-v1.png` | `b00a644646bfb7aa36e956a1b50a354fc40233461a4f7335db68e887df9491ca` | Pearl/lilac/aqua celebration object without casino spectacle |

Shared gift prompt contract: one isolated social-gift medallion, centered and fully
visible, premium soft-3D clay/satin object with aqua-lilac rim light and pearl
highlights on a circular midnight pedestal; no text, number, price, logo, currency,
casino symbol, coin, brand, or extra prop. The individual subject sentence named tea,
coffee, chocolate, rose, amber tespih, or cake. The rack prompt similarly requested one
empty, symmetric, wide two-tier soft-touch rack with satin aqua shelf inlays, pearl
edge, and a center suitable for responsive stretching.

### Avatar crop v2

- Source remains `assets/game/avatar-atlas.png`; characters were not regenerated.
- `scripts/crop-avatar-medallions.sh` takes twelve equal `300 x 300` squares from the
  regular 4-by-3 atlas and normalizes them to `512 x 512` with Lanczos filtering.
- Runtime masking is a generic exact circle. There are no gender- or index-specific
  offsets. `assets/game/avatars/v2/contact-sheet.png` is review evidence, not a runtime asset.
- Avatar SHA-256 values, in display order: `02795c8969d2f481687a472bc6bea7389cb217afad81410c4d8b25599a3ec594`,
  `02b5f1035adc485f59ff8afa9f3e6844ede946c38b4008c9998800eb66ae2eef`,
  `6c46fe4dc6c7963dbd9e03c3cb9d578f7d8a5f5c3b7958e847ef92a857931843`,
  `08ec0cf28a733a704a4e03f2e7a28479f1b0fe1dc1a0d8818225a57f7b914a28`,
  `99c697600bed94a785f71346d385cb3dcbaf218139b6315b1226ab296b6dd2fc`,
  `f3e7f4f85b9329a87f1efcd431a1feea81356a3fb7c5d67057d3afa9ae71b223`,
  `0ced4ffbe56ed0caba4dc43e4de13fa6d61651d2753a97171430e5536b0711b9`,
  `d03736234641b7fcdc15024988ccf9c1059e931000d959416e65ec364cf8b485`,
  `9b3911b91f8e00e1d201b43e03ea8d80526ece547fad7e7dfce036ee2f83882e`,
  `4a2b89cb16b2b8ae8fd80ceec298ae49f779d89be2881822aa29b6dd28b90c6e`,
  `86905d6824bc79000d500f667593c1e7fb33f57e53f57396b4654d6ace548b39`,
  `45fd47ef3ffcd58953d8fcfea6c5dc95c2c05b51e74893b6c0c2aa3312e5edf1`.

## 2026-08-13 optional Kahvehane theme set

The built-in ChatGPT Images generator created this optional theme from text only.
It is a complementary Luma atmosphere, not a replacement for the original
midnight/pearl identity. No user screenshot, competitor image, logo, brand, tile
number, or gameplay symbol was supplied to the generator. Gameplay faces remain
deterministic React Native UI.

| Asset | File | SHA-256 | Runtime role |
|---|---|---|---|
| Kahvehane style frame | `assets/concepts/kahvehane/kahvehane-style-frame-v1.png` | `14bcb7a35b1671277f3339b7415205a8a92c0ca6378a8a9e9e73381c11b1eb1f` | Warm, restrained coffeehouse art-direction and optional table backdrop |
| Empty walnut rack | `assets/game/themes/kahvehane/kahvehane-rack-v1.png` | `98fc343dcee95ed2256a5c4c7f2a3ba004be85a81623e79e56b8f6471e5dff65` | Transparent two-shelf runtime rack; 21/22 tiles remain responsive and scrollable |
| White tile material study | `assets/concepts/kahvehane/kahvehane-tile-materials-v1.png` | `446440f2ea03ccce0d51988e56099bd80dab30e745ea2551cf661166c689e58f` | Non-runtime reference for ivory resin, patina, bevel and recess |

### Kahvehane prompts

Style frame prompt: create one original, calm and authentic Turkish neighborhood
coffeehouse Okey scene at blue hour, with a polished walnut table, four empty wooden
two-tier racks, a blank ivory wall, tea glasses and warm brass lamps. Keep a wide
slight top-down camera and generous responsive safe space. Use realistic materials
with restrained Luma aqua/lilac reflections. No people, smoke, text, logo, brand,
currency, casino imagery, green felt, numbered tiles, copied venue, or watermark.

Rack prompt: create one isolated, empty, symmetric, wide two-tier walnut Okey rack,
straight-on with slight top-down perspective, clear upper and lower shelves, raised
rails and small satin-brass end details. Preserve a broad uniform center suitable for
nine-slice responsive stretching. Transparent background; no tiles, text, number,
symbol, logo, brand, currency, casino cue, table, hand, or watermark.

Tile-material prompt: create a 3-by-2 studio sheet of six isolated blank white/ivory
Okey tile faces, mixing clean resin and subtly aged coffeehouse resin. Each tile has
a shallow circular suit recess but no glyph. Exact front view, matching proportions,
soft bevel and tactile micro-wear. Transparent background; no number, symbol, text,
logo, brand, currency, casino cue, rack, hand, or watermark.

Selection rationale: the rack has continuous grain and two unambiguous shelves; the
tile study adds physical warmth without sacrificing code-drawn readability; and the
environment reads as a real social coffeehouse without reproducing casino UI or a
competitor's trade dress. Release review must still check accidental marks and
small-screen contrast.
