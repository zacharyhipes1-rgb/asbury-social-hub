# Rebuilding the Rooted page in the GoHighLevel page builder

Two pastes and six image swaps. About 20 minutes.

| File | Goes into |
|---|---|
| `page-custom-css.css` | Page Settings → Custom CSS |
| `page-custom-code.html` | A Custom JS/HTML element on the page |

> GHL renames menu items between releases. Labels below are current as of writing;
> if one does not match, the surrounding step still describes what you are looking for.

---

## Why it is two pastes and not a native rebuild

The page is not a stack of GHL components. It uses fluid `clamp()` type, layered
gradient scrims, a CSS grid numbered list, an IntersectionObserver reveal system, and
an SMS deep link that changes syntax per platform. Rebuilding that with native GHL
elements gets you something that *resembles* the page, not the page.

The two files here are the real page, with its CSS scoped to `#itf-rooted` so it
cannot leak into GHL's own sections or the builder chrome. Verified in a host page
that loads competing resets both before and after: the block keeps its typography and
black background, the surrounding GHL sections keep theirs, and nothing bleeds either
direction.

**Trade-off, stated plainly:** your team cannot edit this page by dragging blocks in
the builder. Copy changes mean editing the code element. If that is a dealbreaker,
rebuild the top hero natively and keep the rest as code, or accept a page that is
about 80% visually faithful. Do not expect both.

---

## Step 1. Upload the six photographs

1. Left sidebar → **Media Storage** (some accounts show it under **Settings → Media**).
2. **Upload** these six files from `public/img/rooted/` in this repo:
   - `hero-kettlebell-class.jpg`
   - `class-coaching.jpg`
   - `detail-kettlebell-rack.jpg`
   - `detail-rower.jpg`
   - `band-class-plank.jpg`
   - `closing-deadlift-pair.jpg`
3. For each one, click it → copy its URL. Keep them in a scratch note.

You need all six URLs before Step 5.

---

## Step 2. Create the page

1. Left sidebar → **Sites**.
2. **Funnels** (for a campaign with a step flow) or **Websites** (for a standalone URL).
   For Rooted, **Funnels** is the better fit.
3. **+ New Funnel** → name it `Rooted Fall 2026` → **Create**.
4. Add a step named `Bring a Friend`, path `rooted` → **Create Step**.
5. Click **Edit Page**. The builder opens.

---

## Step 3. Paste the CSS

1. In the builder top bar, open **Settings** (gear icon) → **Custom CSS**.
2. Paste the entire contents of `page-custom-css.css`.
3. **Save**.

The `@import` for Google Fonts is the first line and must stay first — CSS ignores
`@import` if any rule precedes it.

---

## Step 4. Add a full-width code element

This is the step people get wrong. GHL's default section padding will box the page in
and the full-bleed hero will not reach the edges.

1. **Add Section** → choose the blank / full width option.
2. Click the **section** → set **Width** to `Full Width`, and every **Padding** value
   (top, bottom, left, right) to `0`.
3. Click the **row** inside it → set padding to `0` and, if there is a max-width or
   "content width" control, set it to full.
4. Click the **column** → padding `0`.
5. Drag in a **Custom JS/HTML** element (sometimes listed as **Code**).

---

## Step 5. Paste the markup and swap the images

1. Click the code element → **Open Code Editor**.
2. Paste the entire contents of `page-custom-code.html`.
3. Find and replace these six tokens with the URLs from Step 1:

   | Token | Image |
   |---|---|
   | `REPLACE_HERO_URL` | `hero-kettlebell-class.jpg` |
   | `REPLACE_CLASS_URL` | `class-coaching.jpg` |
   | `REPLACE_KETTLEBELL_URL` | `detail-kettlebell-rack.jpg` |
   | `REPLACE_ROWER_URL` | `detail-rower.jpg` |
   | `REPLACE_BAND_URL` | `band-class-plank.jpg` |
   | `REPLACE_CLOSING_URL` | `closing-deadlift-pair.jpg` |

4. **Save**.

Searching the file for `REPLACE_` afterwards should return nothing.

---

## Step 6. Set the phone number and location

Near the bottom of the code element, find the `CONFIG` block and fill in the two
values that are currently empty:

```js
var CONFIG = {
  PHONE: '+12055550142',                    // E.164, the location's text number
  PHONE_DISPLAY: '(205) 555-0142',          // how it reads on the page
  LOCATION: 'Iron Tribe Fitness Homewood',  // full location name
  LOCATION_SHORT: 'Homewood',               // neighbourhood
  SMS_BODY: 'FRIEND'
};
```

Until `PHONE` is filled in, every call to action deliberately stays an inert `#claim`
anchor rather than rendering a broken `sms:` link. That is intended behaviour, not a bug.

The page also carries eight visible **Needs input** markers (class schedule, coaches,
address, parking and so on). Search the code element for `Needs input` and replace each
with the real detail, or delete the marker if the line does not apply. Do not invent
any of them.

---

## Step 7. SEO and the share card

The `<head>` tags do not come across in a code element. Set them in GHL instead.

1. Builder → **Settings** → **SEO Meta Data**.
2. Fill in, copying from `seo-fields.md` in this folder.
3. Upload `public/og-bring-a-friend.jpg` as the share image and paste its **full
   absolute URL**. Relative paths do not resolve on Facebook or LinkedIn.

---

## Step 8. Publish and check

1. **Save** → **Preview**.
2. Check on a real phone, not just the builder's mobile preview, because the SMS deep
   link only fires on a device.

Run this list:

- [ ] Hero photograph fills edge to edge with no white gutter
- [ ] Headline reads "Bring a friend. You both get new shoes."
- [ ] All six photographs load (hero, class floor, two squares, mid-page band, closing)
- [ ] Sections fade in on scroll
- [ ] Tapping a CTA on a phone opens Messages, prefilled `FRIEND` to the right number
- [ ] No sideways scrolling at phone width
- [ ] GHL sections above and below still look like themselves
- [ ] FAQ items open and close
- [ ] No `REPLACE_` or `Needs input` left anywhere

---

## If something looks wrong

**Fonts look generic.** The `@import` is not first in the Custom CSS box, or GHL is
overriding the font at theme level. Check Settings → Fonts and set it to not force a
global font family.

**The hero is boxed in with margins.** A section, row or column still has padding or a
max width. Re-check Step 4 — all three levels need it.

**Reveals never appear.** The code element's `<script>` did not run. Confirm you pasted
the whole file including the closing `</script></div>`, and that GHL has not stripped
it; some accounts require the element type to be Custom JS/HTML rather than plain text.

**Other GHL sections changed appearance.** Something unscoped got pasted into Custom
CSS. Every rule in `page-custom-css.css` below the GLOBAL block starts with
`#itf-rooted`; the three global lines are intentional and limited to smooth scrolling,
the anchor offset, and the page background.

---

## Keeping the two in sync

`public/iron-tribe-bring-a-friend.html` in this repo stays the source of truth. These
two files are generated from it. If the page changes, regenerate rather than hand
editing both, or they will drift.
