# Rebuilding Rooted with GHL drag-and-drop widgets

No code elements. Native widgets only, section by section, with paste-ready copy.

**Set the global styles first (Step 0) or you will redo every widget.**

Honest expectation: native widgets get you close, not identical. Three things do not
survive: the fluid headline sizing, the angled clip on the buttons, and the numbered
grid in "What happens after you text." Everything else transfers.

---

## Step 0. Global styles, do this once

Builder → **Settings** (gear) → **Styles / Global Styles**.

**Fonts**

| Use | Font | Weight |
|---|---|---|
| Headings | Archivo | 900 |
| Labels, buttons, kickers | Barlow Semi Condensed | 600–700 |
| Body | Mulish | 400 |

If a font is missing, **Settings → Fonts → Add Google Font** and add all three.

**Colours** — add these as your palette:

| Name | Hex | Used for |
|---|---|---|
| Orange | `#FF6F20` | Primary buttons, kickers, accents |
| Red | `#EF4040` | Gradient end only |
| Black | `#000000` | Page background |
| Panel | `#141619` | Cards, boxes |
| Panel 2 | `#0B0C0D` | Alternating sections |
| Border | `#24262A` | All hairline borders |
| Body text | `#B8BCC0` | Paragraphs |

**Page background:** `#000000`. Set it now so every section inherits it.

**Type sizes** (desktop → mobile):

| Widget | Desktop | Mobile |
|---|---|---|
| H1 | 68px | 32px |
| H2 | 46px | 30px |
| H3 | 21px | 18px |
| Kicker | 13px, uppercase, letter-spacing 0.22em | same |
| Body / lede | 18px | 16px |
| Button text | 16px, uppercase, letter-spacing 0.11em | 15px |

All headings: **uppercase**, line-height **0.94**, letter-spacing **-0.025em**.

**Button style** (set once as the global button): background gradient `#FF6F20 → #EF4040`
at 97°, or solid `#FF6F20` if your version has no gradient picker. Text white, uppercase.
Padding 16px top/bottom, 28px left/right. No border radius.

---

## Section 1. Sticky header

1. **Add Section** → 1 column. Set background `#000000`, padding 12px top/bottom.
2. Turn on **Sticky** in the section settings.
3. Add a **Row** with 3 columns: `20% / 55% / 25%`.
4. Column 1: **Image** widget → your Iron Tribe logo. Max height 34px.
5. Column 2: **Menu / Navigation** widget. Four links, all jumping to section anchors:

   | Label | Links to |
   |---|---|
   | The offer | Section 3 |
   | A session | Section 4 |
   | After you text | Section 8 |
   | FAQ | Section 9 |

   Set each section's **ID** in its settings (`offer`, `floor`, `after`, `faq`) and point
   the menu links at `#offer`, `#floor`, `#after`, `#faq`.
6. Column 3: **Button** → text `TEXT FRIEND`, link `sms:YOURNUMBER?body=FRIEND`.

---

## Section 2. Hero

1. **Add Section**, 1 column, **Full Width**.
2. Section background → **Image** → `hero-kettlebell-class.jpg` from your Landing Page
   Photos folder. Position `center 32%`, size `cover`.
3. Add a background **Overlay**: black at **62%**. Without it the headline is unreadable.
4. Section padding: 120px top, 90px bottom. Mobile: 70px / 40px.
5. Inside, add a **Row**, 2 columns `60% / 40%`. Put everything in column 1 and leave
   column 2 empty — that is what keeps the headline off the athlete on the right.

Stack these widgets in column 1:

**Text** (kicker style, orange, uppercase, letter-spacing 0.22em):
```
ROOTED · SEPT 21 TO OCT 30
```

**Heading H1:**
```
Bring a friend. You both get new shoes.
```

**Text** (body, white):
```
Rooted is our fall six week trial at Iron Tribe Fitness. A coach scales every movement to what you can do today, so you do not need to be in shape to start. Group classes are $259, personal training is $499. Text us and we will help you pick.
```

**Button** → `TEXT FRIEND TO (YOUR NUMBER)`, link `sms:YOURNUMBER?body=FRIEND`
**Button** (secondary, transparent bg, 2px white border) → `SEE WHAT A SESSION LOOKS LIKE`, link `#floor`

**Text** (14px, white, with a ✓ or a check **Icon** widget beside it):
```
Shoes for both of you when you complete sign up
```

**Row**, 3 columns, each with a **Text** widget. Background `rgba(0,0,0,0.5)`, 1px border
`#24262A`, padding 12px/20px:

| Big line (22px, Archivo 900) | Small line (11px, uppercase, ls 0.15em, grey) |
|---|---|
| 6 weeks | SEPT 21 TO OCT 30 |
| $259 | GROUP CLASSES |
| $499 | PERSONAL TRAINING |

---

## Section 3. The offer — ID `offer`

Background `#000000`, padding 90px top/bottom.

**Text** (kicker): `WHAT ROOTED IS`
**Heading H2:** `Two ways to train for six weeks.`
**Text:**
```
Same six weeks either way, September 21 to October 30. The difference is how much of a coach's attention you get and how the week is structured. If you are not sure which one suits you, that is what the first conversation is for.
```

Then a **Row, 2 columns**. Each column: background `#141619`, 1px border `#24262A`,
padding 30px. Add a 3px `#FF6F20` top border if your version allows per-side borders.

**Column 1**
- Text (kicker, orange): `OPTION ONE`
- Heading H3: `Iron Tribe class`
- Text (34px, Archivo 900, white): `$259`
- Text (13px, uppercase, grey): `FOR THE SIX WEEKS`
- **Bullet List** widget, orange check icons:
  - Coached group classes on the main floor
  - An InBody scan and an intake form before you start
  - Your class schedule and goals set with a coach
  - Entry to the body composition challenge
- Button, full width: `TEXT FRIEND TO START`

**Column 2**
- Text (kicker, orange): `OPTION TWO`
- Heading H3: `Personal training`
- Text (34px): `$499`
- Text: `FOR THE SIX WEEKS`
- Bullet List:
  - One to one sessions built around you
  - A full assessment before your first session
  - Programming adjusted as the six weeks go on
  - Entry to the body composition challenge
- Button, full width: `TEXT FRIEND TO START`

Below the row, a 1-column **Row**, background `#141619`, left border 3px `#FF6F20`,
padding 20px:

**Text** (bold orange): `ALREADY A MEMBER?`
**Text:**
```
You can add a hybrid upgrade for $249, which is 12 personal training sessions at twice a week alongside your classes. Bring a friend who is not a member and that upgrade is $219. If your friend signs up for Rooted you both get new shoes, and you get the Rooted shirt. Ask a coach at the gym or text us.
```

---

## Section 4. What happens in a class — ID `floor`

Background `#0B0C0D`, padding 90px.

**Text** (kicker): `ON THE FLOOR`
**Heading H2:** `What actually happens in a class.`
**Text:**
```
You will not be handed a program and left to work it out. A coach runs the room from the first minute to the last, and every movement has a version that matches what your body can do right now.
```

**Row, 2 columns** `50% / 50%`.

**Column 1** (images)
- **Image** → `class-coaching.jpg`, full width
- **Text** directly under it, 11px uppercase grey on a dark strip:
  `REPRESENTATIVE TRAINING PHOTO, NOT THIS LOCATION`
- **Row, 2 columns** nested → **Image** `detail-kettlebell-rack.jpg` and **Image**
  `detail-rower.jpg`, both square

**Column 2** (the four beats) — use four **Text** widgets, each with a 1px bottom border
`#24262A` and 16px padding. Label in orange Barlow uppercase 12px, body under it:

| Label | Body |
|---|---|
| WARM UP | The coach walks the room through the movements you are about to do and shows you the version you will be using. |
| THE WORK | Barbells, kettlebells, rowers and bodyweight movements, programmed for the day. Everyone works the same session at their own load. |
| COACHING | You get corrected while you are moving, not afterwards. If something hurts or does not feel right, the coach changes it on the spot. |
| COOL DOWN | You finish together. Most people stay and talk for a few minutes, which is usually how the first friendships start. |

**Then, below the row:**

**Heading H3:** `Your first visit, start to finish`

1-column **Row**, background `#141619`, left border 3px `#FF6F20`, padding 20px:
- Text (orange, uppercase, bold): `WALKTHROUGH VIDEO TO COME`
- Text:
```
A short clip filmed at the gym showing where to park, where to put your things, the waiver, and walking into your first class. Nothing generic has been put here in its place.
```

When you have the footage, delete this row and drop in a **Video** widget.

---

## Section 5. Objections

Background `#000000`, padding 90px.

**Text** (kicker): `BEFORE YOU TALK YOURSELF OUT OF IT`
**Heading H2:** `The things people ask us quietly.`

**Row, 2 columns.** Four boxes total, two per column. Each: background `#141619`,
1px border `#24262A`, padding 24px, **Heading H3** + **Text**.

**1. I have not trained in years**
```
That describes a good share of the people who start Rooted. The first conversation and the assessment exist so the coach knows where you are actually starting from, and the first few weeks get built from there rather than from where someone else is.
```

**2. Everyone will be fitter than me**
```
Some will be, and they were where you are at some point. Because the session scales, you are doing the same workout as the person next to you at a load that makes sense for you. Nobody is keeping score of what anyone else lifted.
```

**3. I do not know how to do the movements**
```
That is the coach's job, not yours. You get shown the movement before you do it and corrected while you do it. Ask questions in class. People do it constantly.
```

**4. I have an old injury**
```
Tell the coach during your assessment and again before class. Movements get swapped for something that works around it. We are not medical providers, so if you are under care for something, check with your provider first.
```

---

## Section 6. Photo band

1. **Add Section**, 1 column, **Full Width**, **all padding 0**.
2. Background **Image** → `band-class-plank.jpg`, size `cover`, position `center 42%`.
3. Set section **height** to 340px desktop, 200px mobile.
4. Add one **Text** widget, bottom-left, 11px uppercase, white at 70%:
   `REPRESENTATIVE TRAINING PHOTO, NOT THIS LOCATION`

---

## Section 7. The challenge

Background `#0B0C0D`, top and bottom border 1px `#24262A`, padding 90px.

**Text** (kicker): `RUNNING ALONGSIDE`
**Heading H2:** `The six week challenge.`
**Text:**
```
Rooted runs with a body composition challenge. It is optional to care about, and plenty of people just come to train. If you do want something to aim at, this is it.
```

**Row, 2 columns.** Both: background `#141619`, border `#24262A`, padding 24px.

**Column 1** — H3 `How it is scored`, then:
```
Two things: the change in your body fat percentage measured on the InBody scanner, and how often you showed up. You get scanned at the start and again on October 26.
```
Then a nested **Row, 3 columns**, each a Text widget, orange number over grey label:
`$500` / FIRST · `$250` / SECOND · `$100` / THIRD

**Column 2** — H3 `The root wall`, then:
```
At the start everyone writes one thing they want to grow this fall on a paper leaf and puts it on the wall. Energy, strength, patience, consistency, whatever it is for you. As people hit milestones they add a second leaf with what they actually got. By the end of October the wall is full of them.
```

---

## Section 8. After you text — ID `after`

Background `#000000`, padding 90px.

**Text** (kicker): `NO SURPRISES`
**Heading H2:** `What happens after you text.`
**Text:**
```
Texting does not sign you up for anything and does not take payment. It starts a conversation. Here is the whole path so you know what you are agreeing to and when.
```

Six **Rows**, each 2 columns `10% / 90%`, each with a 1px bottom border `#24262A`
and 18px padding.

Column 1 is a **Text** widget with the number in orange Archivo 900, 20px.
Column 2 is a **Text** widget: bold white title, then the body under it.

| # | Title | Body |
|---|---|---|
| 01 | You text FRIEND | Send the word to the number below. A real person at the gym gets it. |
| 02 | We call you to book a time | Usually the same day. We are arranging a consultation, not selling you anything over the phone. |
| 03 | You come in and we talk it through | Your goals, your schedule, what you have done before. At the end of it you and the coach decide whether classes or personal training makes more sense. |
| 04 | Paperwork and payment | If you want to go ahead, that is a waiver and a six week agreement, and payment is taken then to hold your spot. This is the point where it becomes a commitment. |
| 05 | Your baseline | An InBody scan and intake form if you are doing classes, a full assessment if you are doing personal training. Then your schedule gets set. |
| 06 | You start on September 21 | Six weeks, finishing October 30. |

---

## Section 9. FAQ — ID `faq`

Background `#0B0C0D`, padding 90px.

**Text** (kicker): `STRAIGHT ANSWERS`
**Heading H2:** `Anything else.`

Add an **Accordion** widget (called **Toggle** or **FAQ** in some versions) with six items.
Question text white 17px, background `#141619`, 1px border `#24262A`.

**How much time does this take each week?**
```
Class times and how many sessions a week you do get set with your coach at the consultation, based on what you can realistically hold for six weeks.
```
> Add this location's class schedule here.

**What should I bring on the first day?**
```
Training shoes, a water bottle, and enough time to arrive about ten minutes early so someone can show you round before class starts.
```

**Am I going to get a hard sell?**
```
The consultation is a real conversation about whether this fits. If it does not, that is a fine answer and you have not paid anything at that point.
```

**What happens when Rooted finishes on October 30?**
```
The six week agreement covers you through October 30. If you want to carry on after that, your coach will talk you through the membership options near the end of the six weeks.
```
> Confirm the exact post-Rooted pricing and whether anything is held for participants.

**Can I do this with the friend who sent me here?**
```
Yes. Tell us when you text and we will try to put you in the same classes. Training next to someone you know is a good part of why this works.
```

**Is there an age requirement?**
> Confirm the minimum age and whether under 18s can take part with a guardian signature.

---

## Section 10. Location

Background `#000000`, padding 90px.

**Text** (kicker): `WHERE TO FIND US`
**Heading H2:** `Iron Tribe Fitness` (add the location name once confirmed)
**Text:**
```
Text the word FRIEND and we will get back to you to book your consultation. If you would rather just turn up and look at the place first, that is fine too.
```
**Button:** `TEXT FRIEND TO (YOUR NUMBER)`

**Row, 2 columns.** Column 2 holds five **Text** widgets, each an orange uppercase label
with the detail under it:

| Label | Fill in |
|---|---|
| ADDRESS | Street address, suite and city |
| PARKING | Where people park and how long it takes to walk in |
| CLASS TIMES | The published schedule |
| COACHES | Who is coaching, with names |
| TEXT US | The location phone number |

---

## Section 11. Closing

1. **Add Section**, 1 column, **Full Width**, text centred.
2. Background **Image** → `closing-deadlift-pair.jpg`, position `center 30%`, size cover.
3. Overlay: black at **68%**.
4. Padding 100px top/bottom.

**Text** (kicker, centred): `ROOTED · SEPT 21 TO OCT 30`
**Heading H2** (centred): `Someone thought you'd like it here.`
**Text** (centred):
```
Six weeks, a coach, and a room that will know your name by the second week.
```
**Button:** `TEXT FRIEND TO (YOUR NUMBER)`
**Button** (outline): `LOOK AT THE OFFER AGAIN` → `#offer`

---

## Section 12. Footer

Background `#000000`, top border 1px `#24262A`, padding 50px.

Logo, then the nav links again, then a **Text** widget at 12px in grey `#6B6E72`:

```
Rooted runs 21 September to 30 October 2026. Six weeks for $259 in group classes or $499 in personal training. A waiver and a six week agreement are signed at sign up and payment is taken at that point to hold the place. Final InBody scans are on 26 October. Shoes for both people and the member shirt are issued on a completed sign up. Body composition challenge prizes are $500, $250 and $100. Training is not medical advice; speak to your own provider if you have a condition or injury.
```

> Have the above reviewed and add eligibility, age and participating-location wording.

Then, smaller still:
```
Photography on this page is licensed Adobe Stock standing in for location photography and does not show this gym. Adobe Stock files 438478307, 584174268, 906164666, 482549678, 453789215 and 139254492, licensed under the Adobe Stock standard licence.
```

---

## The SMS links

Every button that says TEXT FRIEND uses this as its link:

```
sms:+1XXXXXXXXXX?body=FRIEND
```

iPhones want `&body=` rather than `?body=` in some contexts. GHL cannot branch on device,
so use `?body=` — it works on Android and on current iOS. Test on a real iPhone before you
run traffic. If the prefilled word does not appear, drop the parameter and use plain
`sms:+1XXXXXXXXXX`; the page tells people to text FRIEND anyway.

---

## Before you publish

- [ ] All six photographs load
- [ ] Every TEXT FRIEND button opens Messages on a real phone
- [ ] Section IDs set: `offer`, `floor`, `after`, `faq` — and the menu links jump correctly
- [ ] Mobile: no sideways scroll, headline not more than 4 lines
- [ ] SEO set from `seo-fields.md`, share image uploaded with an absolute URL
- [ ] No "Needs input" left: schedule, coaches, address, parking, age, post-Rooted pricing
- [ ] Offer facts unchanged: six weeks, 21 Sep to 30 Oct, $259 / $499, text FRIEND
