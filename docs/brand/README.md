# Iron Tribe Fitness — Brand Reference

Distilled from `ITF_Brand_Guidelines.pdf` (Brand Style Guide, 23 pages), which is the
authoritative source. This file exists so the values are greppable and usable directly
in code. **Use these on all Iron Tribe Fitness work.** When this file and the PDF
disagree, the PDF wins.

## Colors

### Primary

| Name | Hex | Notes |
|---|---|---|
| Iron Tribe Orange | `#FF6F20` | The primary brand color. Leads the identity. |
| Iron Tribe Red | `#EF4040` | Secondary. Pairs with orange in the brand gradient. |
| Combined gradient | `#FF6F20` → `#EF4040` | Signature treatment for the mark. Preferred version of the logo wherever possible. |

### Neutrals

| Name | Hex | Notes |
|---|---|---|
| Black | `#000000` | |
| Banner gray | `#55585B` | The gray used in the main logo's banner. |
| Gray | `#9BA7AF` | Logo gray variation. Also the gray version of the mark. |
| Program gray | `#848689` | Used in program logos. |
| White | `#FFFFFF` | Logo version for dark backgrounds. |

### Accents

| Name | Hex | Used for |
|---|---|---|
| Blue | `#25AAE1` | Mark color variation. PEAK program. |
| Yellow | `#F5EE31` | Program logo. |

### Apparel colors

Approved for shirts, sweatshirts and similar: black, white, charcoal, navy, heather gray,
military, royal, green.

## Typography

| Role | Typeface | Weights shown in the guide |
|---|---|---|
| Primary headline | **Ridley Grotesk** | Extra Bold, Italic |
| Secondary headline | **DIN 2014 Narrow** | Narrow |
| Body copy | **Avenir** | Book, Medium, Next Bold |

Ridley Grotesk is described as a modern sans-serif and should be the first choice for
headlines in print and web. DIN 2014 is tall and strong and contrasts well against Ridley
Grotesk. Avenir carries all body copy.

### Web substitutes

None of the three are licensed for free web use or available on Google Fonts. Until
licensed web font files are self-hosted, use these substitutes, which are the closest
freely available matches:

| Brand font | Web substitute | Why |
|---|---|---|
| Ridley Grotesk | **Archivo** | Modern grotesk with a full weight range up to Black. |
| DIN 2014 Narrow | **Barlow Semi Condensed** | Barlow is explicitly DIN-derived; the semi-condensed cut matches DIN 2014 Narrow's proportions. |
| Avenir | **Mulish** | Geometric humanist sans, the standard free stand-in for Avenir. |

To switch to the real fonts later, self-host the licensed `.woff2` files. The app's
Content-Security-Policy already permits `font-src 'self'`, so no policy change is needed.

## Logo rules

- Prefer the gradient version of the mark, or the white version on dark backgrounds.
- Use the gray version on light backgrounds, the white version on dark.
- Clear space: leave half the logo's height (`0.5x`) on all sides. For the mark alone,
  leave a quarter of its height (`0.25x`).
- In high-awareness markets, lead with the mark rather than the full logo.
- Place the logo on high-contrast backgrounds. A dark, blurred background lets it pop.

### Never

Use off-brand colors, stretch the logo, add excessive shadowing, stack the logo, place an
object on top of it, or put a border around it.

## Programs

Four programs: **PRIME**, **POWER**, **PERFORM**, **PEAK**. Use the dedicated program
logos when referring to any of them. Program logo accents include gray `#848689`,
yellow `#F5EE31` and blue `#25AAE1`.

## Posters

Posters carry event and deal announcements on gym walls. The logo goes at the top, brand
fonts throughout, and text sits on a high-contrast background. Standard sizes are
11x17, 18x24 and 24x36 inches.

## Where this is applied

Two design directions for the Bring a Friend Month promotion. Same copy, same brand,
same offer — pick one before launch and delete the other.

| File | Direction |
|---|---|
| `public/iron-tribe-bring-a-friend.html` | **Option A, dark cinematic.** Black field, orange rake light, film grain, glowing gradient buttons, card grids, scroll-tilt reveals. |
| `public/iron-tribe-bring-a-friend-poster.html` | **Option B, printed press.** White stock, huge black display type, hairline rules, hanging numerals, rotated ink stamp, fill-in-the-blanks application form, full-bleed orange closing panel. Follows the poster rules in the guide. |

### Note on orange contrast

`#FF6F20` on white is about 2.9:1, which fails WCAG for body text. On light layouts use
orange for large display type, rules, numerals, stamps and filled panels only. Body copy
runs in `#55585B` (about 7:1) or black. A filled orange panel carries **black** type, not
white — white on `#FF6F20` is about 2.3:1.
