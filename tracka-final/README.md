# Tracka — the real website (complete)

Everything from the demo, working for real on your Supabase database:

| | What works |
|---|---|
| 📱 Login | Phone number + SMS code |
| 🎧 Artists | Campaigns, song upload, pick promoters + dates (calendar), pay with MoMo, live tracker with every step, approve / report a problem, stars, tips, receipt, book again, settings, photo or avatar |
| 🎤 Promoters & DJs | 3-step sign-up with private ID, bookings: accept (48 h) → date → live → proof (screenshot / video / link), answer problems, calendar, profile + CV, money |
| 👑 You (Control room) | Money overview, verify / reject / suspend promoters, add promoters met in person, confirm payments, listen to songs, approve proofs, settle problems, payouts, refunds, tips, settings, open services |
| 🎵 Extras | Your song on the home page (the circle dances to the beat), animated journeys, notifications, Terms, How it works |

---

## 1. Run it on your computer (Windows)

1. **Unzip** `tracka-web.zip` → open the `tracka-web` folder.
2. Click the folder's **address bar**, type `cmd`, press **Enter**.
3. `npm install` (wait 1–3 minutes).
4. **Create `.env.local`** from `.env.example` (copy, rename, open with Notepad) and paste your 2 public values
   from Supabase's **Connect** button: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Turn on *View → File name extensions* in File Explorer to be sure it isn't `.env.local.txt`.
5. Supabase **SQL Editor** → run `supabase/patch-01.sql` once (admins get notified about new promoters).
   *(You already ran `supabase/schema.sql`.)*
6. `npm run dev` → open **http://localhost:3000**

Red error? **Screenshot it and send it to Claude.**

## 2. Test the whole road (20 minutes, 3 test phones)

| Who | Phone | Code |
|---|---|---|
| You (admin) | 0788 000 001 | 123456 |
| A promoter | 0788 000 002 | 123456 |
| An artist | 0788 000 003 | 123456 |

1. **Admin:** log in with 001. In the Supabase SQL Editor run
   `update public.profiles set is_admin = true where phone like '%788000001';` → refresh → **Control room** appears.
   Go to **Settings**: add a MoMo Pay code, your WhatsApp and email → Save. Log out.
2. **Promoter:** log in with 002 → **Sell on Tracka** → 3 steps (any photo as the ID, any 16 digits) → Join. Log out.
3. **Admin:** log in with 001 → bell 🔔 → **Promoters** → see the ID → **Verify**. Log out.
4. **Artist:** log in with 003 → name → **New campaign** → title + an MP3 → pick the promoter + a date → **Next: pay** →
   transaction ID `TEST1`, phone `0788 000 003` → **I've paid**. Log out.
5. **Admin:** **Payments → Money received** → **Songs** → listen → **Approve song**. Log out.
6. **Promoter:** **Accept** → pick the date → **It's live** → **Send proof** (any screenshot). Log out.
7. **Artist:** see the timeline move → **Looks good** → rate ⭐ → (optional) tip. Log out.
8. **Admin:** **Payouts** → **I sent it** → the artist's **receipt** is ready 🧾

## 3. Put it online (Vercel, free to test)

1. Create a free **GitHub** account → **New repository** `tracka` (Private).
   Upload the **contents** of the `tracka-web` folder (drag & drop on GitHub's page).
   ⚠️ **Do NOT upload** `node_modules`, `.next` or `.env.local`.
2. Go to **vercel.com** → sign in with GitHub → **Add New → Project** → import `tracka`.
3. Before **Deploy**, open **Environment Variables** and add the same 2 values as in `.env.local`.
4. **Deploy.** You get a link like `https://tracka-xyz.vercel.app` 🎉
5. In Supabase → **Authentication → URL Configuration** → set **Site URL** to that link.

## 4. Before real users (launch checklist)

- [ ] Real **SMS provider** (replace the placeholder Twilio codes) — real numbers can't log in until then.
- [ ] Remove the line *“Testing? Use 0788 000 001…”* in `app/login/LoginForm.tsx`.
- [ ] Turn on **pg_cron** reminders (see `supabase` folder notes in the database SETUP guide).
- [ ] Your **company registration** (RDB) and a lawyer's check of the **Terms**.
- [ ] Ask about **BNR rules** for holding artists' money, and **NCSA** registration for ID data.
- [ ] Supabase **Pro** and Vercel **Pro** when Tracka starts making money.
- [ ] Your logo 🎨 and the first 15 real promoters 💪

## Never share
The **secret key** (`sb_secret_…`) and your **database password**. They are never needed in this project.

## Good to know
- Promoters you **add in person** (Control room → Promoters) become theirs automatically when they log in with the same phone number.
- Songs, proofs and IDs are **private files**; pages open them with links that expire after 1 hour.
- Every money step is written in the `money_events` table, ready for your accounting.

---

## What's new in v0.3

| | |
|---|---|
| 📦 **Packages** | Promoters sell several plays for one price (Profile → Packages). Artists pick the package and a date for every play; promoters confirm all dates at once. |
| 🌱⭐🏆 **Levels & badges** | New → Rising (3+ jobs) → Top Promoter (10+ jobs, 4.5★, 90% on time), plus badges like *Always on time* and *Fast delivery*. Promoters see their progress. |
| 🗺️ **Where it played** | A map of Rwanda on every campaign showing which promoters already played the song. |
| 🖼️ **Result card** | A ready-to-post picture of the campaign results (Instagram / WhatsApp status size). |
| 🔥 **Hot on Tracka** | A weekly chart on the home page of songs that went out. |

Database: run `supabase/patch-02.sql` once (after `patch-01.sql`).

## Practice bookings (v0.4)

Example promoters can be booked in a **practice campaign**: no money, no real plays. The Tracka team plays their part in
**Control room → Practice** (Accept → Dates → It's live → Proof), so the whole road can be tried from start to finish.
Practice never goes in the money records, tips go to real promoters only, and example + real promoters never mix in one campaign.

Database order: `schema.sql` → `update-v0.3.sql` → `patch-03.sql` → `examples.sql` (optional) → `patch-04.sql` → `remove-examples-button.sql`.
