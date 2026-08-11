# Luma Okey design and asset bible

## Provenance and rights boundary

- **Generated:** 2026-08-11 with the built-in OpenAI/ChatGPT image generation tool.
- **Input:** text prompts below. The eight user-supplied screenshots were reviewed only to extract generic qualities (airy hierarchy, pastel-neon light, soft-clay objects, rounded/glass-like surfaces, aqua emphasis). They were not passed into the generation calls and are not bundled.
- **Origin:** generated output, not a stock library or copied game asset. Use is governed by the operator's applicable OpenAI terms; uniqueness, trademark, and final store/legal clearance are not guaranteed.
- **Release check:** visually review every selected/cropped output for accidental marks, third-party resemblance, age appropriateness, and small-size behavior before shipping. Replace any disputed element.
- **Gameplay rule:** tile numbers, colors, indicator/joker marks, turn state, scores, and actionable icons are deterministic Skia/SVG/text. AI raster output never decides or depicts gameplay-critical glyphs.

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
