# Titan Message Overhaul — Before / After

**Status:** PROPOSAL — nothing in `auto_messages.js` has been changed yet.
**Goal:** more eye-catching, less nosy, scannable, gets drivers to read + adhere.
**Data basis:** infi-central `WeeklyScorecardRecord`, ~325 driver-weeks (last 30–45d).
Safety behaviors (seatbelt/distraction/signals/FICO) = overwhelmingly *Fantastic*.
Real weak spots = **POD** (145 Poor/Fair) and **delivery defects / CDF DPMO** (215 Poor/Fair) — and the bot has **zero** messages for either.

**Design rules applied to every rewrite:**
1. Bold, scannable **hook line** first (one icon, not a wall).
2. One ask per message — what to do, why, done. Cut motivational filler.
3. Bold the *verb/rule*, not the whole paragraph.
4. Keep the policy teeth (disciplinary warnings) but make them land, not drone.

**LOCKED — unchanged per Danny:** Lunch (regular + Cycle0), all 4 Delivery Countdowns (time-left), Friday Timecard, Saturday Timecard, Clock-in (regular + Cycle0). These are not edited below.

---

## A. EARLY BREAK REMINDER (`sendEarlyBreakReminderMessage`, 9:40 AM)

**BEFORE**
> If you're stopping before your first delivery then you are using your first break!
> This means stopping for the restroom, food, or drinks. Come prepared.
> You are expected to be at your first delivery by a certain time. You are putting yourself behind if you stop before then.
> ⏰  ❗

**AFTER**
> ⏰ *Stop before your 1st delivery? That counts as your 1st break.*
> Restroom, food, coffee — handle it **before** you leave the station. Every stop you make before your first delivery puts you behind and burns a break you'll want later.
> Come prepared. Start strong. Stay ahead. 🚀

---

## B. PACING (`sendPacingReminderMessage`, 9:15 / 1:15 / 4:15)

**BEFORE**
> ⬇ Pacing and time management ⬇
> Pacing is essential. Ideally, no stop should take more than 2 minutes to complete. ⌚
> Encountering a problem with a stop that can't be solved quickly? ⌛ It may be better to skip that stop and move on. Don't endanger your whole route for the sake of one stop.
> You are responsible for your own routes. 💪

**AFTER**
> ⏱️ *Pace Check — keep each stop near 2 minutes.*
> Stuck on one stop? **Skip it and keep moving.** One problem package is not worth falling behind on your whole route — that's how completion (DCR) slips.
> You own your route. Protect your pace and finish strong. 💪

---

## C. VAN ISSUE REPORTING (`sendVanIssueReportingMessage`, 9:40 AM)

**BEFORE**
> **Proper Van Issue Reporting**
> ❗ 🚚 📋
> • Post a brief description of the issue in the #on_road_van_issues room. Tag Jessie and Dylan (put the "@" symbol in front of the name) on to the message (Don't try to tag a manager on the upload of a picture).
> • Your message will be acknowledged with a " 👍 " and you will receive a direct message from Jessie or Dylan.
> • Jessie or Dylan will provide further instructions if needed directly to you.
> **NOTE:** If an issue is reported while your van is still at the station, DO NOT LEAVE THE STATION until the issue is addressed by a manager. Disciplinary action will be taken for failing to adhere to this procedure.

**AFTER**
> 🚚 *Van Issue? Report it the right way.*
> 1️⃣ Post the issue in **#on_road_van_issues** — tag **@Jessie** and **@Dylan** (in the text, not on a photo upload).
> 2️⃣ You'll get a 👍 and a DM with next steps.
> 🛑 **Issue found while still at the station? DO NOT LEAVE** until a manager clears it.
> *Skipping this step = disciplinary action.*

---

## D. RTS REMINDER (`sendRtsReminderMessage`, 6:00 PM)

**BEFORE** *(3 long sections — abbreviated here; full text in auto_messages.js)*
> :pushpin: RTS Reminders :pushpin: ... Before you RTS / Parking at Station / Equipment turn in ...

**AFTER**
> 📌 *RTS Checklist — finish clean.* @all
>
> 🔎 **Van check:** any missorts or missing packages? Reattempt missing; deliver missorts within a 15-min radius.
> 🧹 **Clean your van:** trash out, wiped down, swept. You may not have it tomorrow — don't leave your mess.
> 🎒 **Bag check:** device 📱, gas card 💳, keys 🔑, charger 🔋 all inside.
> ⏱️ **Post-trip:** wait the full 2 min (standard) / 3 min (step van).
> ✅ **Show the manager your ADP punches** before you leave — confirm they're recorded.

---

## E. HEAT REMINDER (`sendHeatReminderMessage`, 9:00 AM May–Sep)

**BEFORE** *(4-paragraph pep talk)*
> @all ⚠️ Attention Titans! ⚠️ As always, we're reminding you that the Texas heat is no joke... knock out more than half of your route by 2 PM... We believe in every single one of you... You've got this Titans! 💪🔥

**AFTER**
> 🌡️ *Beat the Texas Heat — half your route done by 2 PM.* @all
> The heat peaks in the afternoon. Knock out **more than half your stops before 2 PM**, while it's cooler and you're fresh — that's your buffer when it gets brutal.
> Start strong, stay organized, manage your time. We've got your back — now go get ahead of it. 🔥

---

## F. HYDRATION (`sendHydrationMessage`, hourly May–Sep)

**BEFORE**
> 🌊HYDRATE HYDRATE HYDRATE🌊
> If you are reading this drink water now!
> Do Not be a victim to Heat. Stay Hydrated

**AFTER**
> 💧 *Reading this? Take a drink — right now.*
> Thirst means you're already behind. Sip often, don't wait. Dehydration ends routes — don't let the heat take yours. 🌊

---

## G. SAFETY ROTATION (`safetyMessages[]`, every 30 min) — all 22 rewritten

*Rationale: drivers already score Fantastic here, so these have become wallpaper. Same rules: bold hook, one ask, trim. Numbered to match array order.*

**1. Distracted Driving**
> 👀 *Eyes up. Hands on the wheel.*
> Looking down or away too long = a Netradyne alert. Reaching for your phone or dash repeatedly = a distraction — and distracted driving is a top cause of on-road crashes.
> 🅿️ The camera only counts you as "parked" in **Park** — not stopped at a red light on the brake.
> ⚠️ Even Bluetooth actions (answering calls, skipping songs) count as phone manipulation.
> **Never hold your phone while driving. No exceptions.**

**2. Severe Infractions**
> 🚨 *Amazon is not playing with safety.*
> A severe infraction can suspend your account **mid-route** — and there's nothing we can do but send you back and take disciplinary action, up to termination.
> See yellow? **Be ready to STOP.** Follow every safety measure, every time.

**3. Following Distance**
> 🚚 *Keep your distance — at least 3 van lengths / 8 seconds.*
> More in rain, traffic, or high speed. Cut off? **Ease off the gas, create space.**
> Space = time to see a hazard and react safely.

**4. No Pet Engagement**
> 🚫🐕 *No pet engagement — ever.*
> Any size, any breed: leave them alone. Animal loose and not restrained? **Use Contact Compliance.**

**5. Report a Dog**
> 🐾 *See a dog (or signs of one)?*
> Add the paw-print: Delivery App → **Help → "Report a dog on your route."** Helps the next driver too.

**6. Avoid Dog Bites**
> 🐕 *Dog present? Don't risk it.*
> Mark **unable to deliver (dog)**, then follow Contact Compliance. **Never exit the van for a loose dog.**

**7. Watch Your Step**
> 🦵 *Look before you step. Every time.*
> Don't jump out of the van — your legs can't take that impact all day. **3 points of contact**, use the steps.
> Slow is smooth, smooth is fast. Rushing = mistakes.

**8. Wet-Weather Footing**
> 🌧️ *Wet day = slip-and-fall risk.*
> 3 points of contact getting out, know your path before you walk it. You've got this — just stay deliberate.

**9. Seatbelt**
> 🦺 *Belt on — across chest and waist, every time the van moves.*
> Never sit on a buckled belt. Faulty belt? Post in **#on_road_van_issues** + tell management. No van rolls with a bad belt.

**10. Speeding**
> 🚛💨 *Watch your speed.*
> Unsure of the limit? Drive what's typical for the road (25–30 in neighborhoods).
> **Go by the SIGNS, not the GPS** — the signs are what the camera sees.

**11. Speed (short)**
> 👀 *Keep an eye on your speed today.*
> In doubt, go slower than you think. **Signs over GPS.** Let's finish strong and safe.

**12. Hydration (come prepared)**
> 💧 *Show up hydrated, bring your own water.*
> Pad water can run out — that's your backup, not your plan. Don't set yourself up for dehydration.

**13. Hydration (be considerate)**
> 🚰 *Bring enough water — it's on you.*
> Amazon runs out sometimes. If there's water on the pad, **grab your share and leave some for others.**

**14. Stop Signs**
> 🛑 *Full stop. Behind the sign. 2 full seconds.*
> Can't see oncoming traffic? Stop at the sign, then **creep forward until you can.** Stay safe, Titans.

**15. Stop Signs (short)**
> 🛑 *Complete stop = van fully stopped.*
> Any roll before you go triggers an alert. Brake all the way.

**16. Traffic Lights**
> 🚦 *Yellow means STOP — don't beat the light.*
> Someone runs a red every ~20 min at busy intersections. Light turns yellow? Come to a safe stop before the intersection.

**17. Doors Closed**
> 🚪 *Never deliver with ANY door open* — driver, slider, or back.
> This is one of the most unsafe things you can do on route: someone can hop in or grab packages, and packages fall out without you noticing. **Close every door, every stop.**

**18. Pedestrian Awareness**
> 🚶 *Stay heads-up for pedestrians.*
> They can step out anywhere — crosswalk or not. Extra alert near **school zones, holidays, and busy hours.**

**19. Hot-Weather Tips**
> 🥵 *Prep for the heat — it starts the night before.*
> 💧 ~1 gal water/day • ☕ skip caffeine (it dehydrates) • 🍎 light snacks • 😴 sleep well • recover with food + rest, not just meds.

**20. Blind Spots**
> 👀 *Be critical at blind spots.*
> Merging? Check mirrors + lean forward for a new angle. Reversing? Mirrors **and** camera **and** Get Out And Look.

**21. Reversing & Driveways**
> 📌 *Avoid reversing — if you must, stay under 5 MPH* (over triggers Netradyne, and it's safer).
> Skip parking on driveways: if you can see the door from the street, **don't pull in.** Stay smart out there. 🏠

## H. ★ NEW MESSAGES (data-driven — added to the 30-min safety rotation as #22 & #23)

These join the `safetyMessages[]` array so they appear in the normal 30-min rotation — no new crons, no cadence change.

### 22. Photo-On-Delivery quality (POD: 145 Poor/Fair — biggest gap)
> 📸 *Your POD is your proof — make every one count.*
> ✅ Package **clearly visible**, at the door, fully in frame.
> ❌ No blur, no thumb over the lens, no dark or empty shots.
> A bad photo becomes a concession and a hit on the station's scorecard — and POD is one of our weakest areas right now. **One clean photo protects you, the customer, and the route. Take the extra second.**

### 23. Scan accuracy / delivery defects (CDF DPMO: 215 Poor/Fair)
> 🎯 *Right package. Right stop. Right scan. Every time.*
> Scan **every** package at **every** stop — no bulk-scanning ahead.
> Wrong scans and missed scans turn into delivery defects (CDF DPMO) on the scorecard, and that's another area we need to tighten up.
> Slow down for the scan — it's far faster than fixing a misdelivery. ✅

---

## Cadence — LOCKED at 30 minutes (Danny, 2026-06-05)

No change. Safety rotation stays every 30 min, 10 AM–7:30 PM. The 2 new
messages above are part of that rotation (now 23 messages in the pool),
so they surface naturally without adding volume to any other cron.

---

## What happens next (on your approval)
1. You read/edit this doc.
2. I apply the approved versions to `auto_messages.js` **on a draft branch** (not `main`).
3. Show you the git diff.
4. Only after you OK it → push to `main` → Railway auto-deploys.
