"""Builds supabase/examples.sql: 20 example promoters + 10 example artists for Tracka demos.
All names are made up. Run:  python3 make-examples.py  (then run examples.sql in Supabase, after patch-03)."""
import random, uuid

random.seed(2026)
NS = uuid.UUID('7a1c0de0-7a1c-4a1c-9a1c-7a1c0de07a1c')
uid = lambda *k: str(uuid.uuid5(NS, '/'.join(map(str, k))))
q = lambda s: "'" + str(s).replace("'", "''") + "'"
arr = lambda xs: "array[" + ",".join(q(x) for x in xs) + "]::text[]"

# key, name, category, price, included, delivery days, town, about, genres, packages (plays, price, note)
SELLERS = [
    ('umucyo', 'Umucyo Wave Radio', 'radio', 12000, '1 play on the evening drive show + shout-out', 3, 'Kigali', "Kigali's favourite evening show for new Rwandan music.", ['Afrobeat', 'R&B', 'Amapiano'], [(3, 30000, '3 plays across one week'), (5, 45000, '5 plays + 5-minute interview')]),
    ('kivu', 'Kivu Breeze Radio', 'radio', 9000, '1 play on the morning show', 4, 'Rubavu', 'Lakeside radio loved by listeners in the west.', ['Afrobeat', 'Gospel'], [(3, 24000, '3 morning plays')]),
    ('ibirunga', 'Ibirunga Sound Radio', 'radio', 8000, '1 play + song introduction', 5, 'Musanze', 'The voice of the north, from the foot of the volcanoes.', ['Afrobeat', 'Hip hop'], []),
    ('huye', 'Huye Campus Waves', 'radio', 6000, '1 play on the student show', 3, 'Huye', 'Run by students, listened to by students.', ['Hip hop', 'Amapiano', 'R&B'], []),
    ('akagera', 'Akagera Sunrise Radio', 'radio', 8500, '1 play in the morning', 5, 'Nyagatare', 'Wake up the east with your song.', ['Gospel', 'Afrobeat'], [(4, 30000, '4 sunrise plays')]),
    ('rusizi', 'Rusizi Riverside Radio', 'radio', 7000, '1 play + shout-out', 6, 'Rusizi', 'Reaching the south-west and across the river.', ['Afrobeat', 'Other'], []),
    ('imena', 'Imena Music TV', 'tv', 60000, 'Your video on the evening countdown', 5, 'Kigali', 'Music videos and countdowns every evening.', ['Afrobeat', 'Amapiano', 'R&B'], [(3, 160000, '3 airings in prime time')]),
    ('lakeside', 'Lakeside Music TV', 'tv', 45000, '1 video airing + ticker mention', 6, 'Rubavu', 'Music TV from the shores of Lake Kivu.', ['Afrobeat', 'Gospel'], []),
    ('dancecrew', 'Dance Challenge Crew', 'tiktok', 25000, '1 dance video with your song', 2, 'Kigali', 'We start the dance; Rwanda follows.', ['Amapiano', 'Afrobeat'], []),
    ('kigalimoves', 'Kigali Moves', 'tiktok', 30000, '1 TikTok video + pinned comment', 2, 'Kicukiro, Kigali', 'Street dance videos from Kigali.', ['Amapiano', 'Hip hop'], [(3, 80000, '3 videos in one week')]),
    ('hypehub', 'Hype Hub RW', 'tiktok', 18000, '1 video on our trending page', 3, 'Musanze', 'Trends, jokes and new music.', ['Hip hop', 'Afrobeat'], []),
    ('amashusho', 'Amashusho Music Reviews', 'youtube', 35000, '1 honest video review', 5, 'Huye', 'Honest reviews of new Rwandan songs.', ['Afrobeat', 'R&B', 'Gospel'], [(2, 60000, 'Review of the song + the video')]),
    ('nextup', 'Next Up Rwanda', 'youtube', 28000, 'Feature in our weekly new-music video', 4, 'Kigali', 'A weekly video of songs you should hear.', ['Hip hop', 'Amapiano', 'Afrobeat'], []),
    ('umuzikiweekly', 'Umuziki Weekly Blog', 'blog', 8000, 'Article + song embed', 2, 'Kigali', 'News and interviews about Rwandan music.', ['Afrobeat', 'Gospel', 'Hip hop'], []),
    ('soundnotes', 'Kigali Sound Notes', 'blog', 6000, 'Short article + share on socials', 3, 'Muhanga', 'Short stories about new songs.', ['R&B', 'Other'], []),
    ('tetastyle', 'Teta Style Diaries', 'influencer', 35000, '1 Instagram reel + 2 stories', 3, 'Kigali', 'Fashion and lifestyle, with the music people love.', ['Afrobeat', 'R&B'], [(3, 90000, '3 reels over two weeks')]),
    ('gakwaya', 'Gakwaya Comedy Corner', 'influencer', 25000, 'Your song in 1 comedy skit', 4, 'Rwamagana', 'Jokes that make songs go viral.', ['Amapiano', 'Hip hop'], []),
    ('ikirere', 'DJ Ikirere', 'dj', 15000, 'Played at 2 club nights', 6, 'Remera, Kigali', 'Weekend club nights in Remera and Kimironko.', ['Amapiano', 'Afrobeat'], [(2, 25000, 'Played across 2 weekends')]),
    ('nyundo', 'DJ Nyundo', 'dj', 10000, 'Played at 1 wedding or event', 6, 'Muhanga', 'Weddings and events across the centre.', ['Afrobeat', 'Gospel'], []),
    ('mwiza', 'DJ Mwiza', 'dj', 12000, 'Played at 1 club night', 5, 'Huye', 'Student nights in Huye.', ['Amapiano', 'Hip hop'], []),
]
S = {s[0]: s for s in SELLERS}
ARTISTS = ['Inzozi Kid', 'Teta Sky', 'Shema Wave', 'Keza Moon', 'Gisa Flow', 'Lil Ineza', 'Amani Rose', 'Kalisa Beats', 'Uwase Soul', 'Mugisha Jay']
GENRE = ['Afrobeat', 'R&B', 'Amapiano', 'Gospel', 'Hip hop', 'Hip hop', 'R&B', 'Amapiano', 'Gospel', 'Afrobeat']
TITLES = ['Inzozi', 'Ndagukunda Cyane', 'Kigali Nights', 'Umutima', 'Byose Bizaba', 'Weekend Vibes', 'Amahoro', 'Ubuzima',
          'Dance for Me', 'Akanyamuneza', 'Sunday Morning', 'Inyenyeri', 'Turi Kumwe', 'Golden Hour', 'Mama Wanjye', 'Rise Up']
REVIEWS = ['Played it twice on the show, great energy!', 'Fast and professional. Will book again.', 'Byari byiza cyane! 🔥',
           'Got lots of new followers after this.', 'My song is everywhere now 🙌', 'They even did a short interview with me.',
           'Clear proof, very honest.', 'Murakoze cyane!', 'Exactly what they promised.', 'The crowd loved it 💃']

# 12 finished campaigns + 4 running ones: (artist index, title index, days ago paid, finished?)
CAMPS = [(i % 10, i, 60 - i * 4, True) for i in range(12)]
CAMPS[10] = (0, 10, 7, True)   # finished this week → on the chart
CAMPS[11] = (3, 11, 8, True)
CAMPS += [(1, 12, 6, False), (4, 13, 5, False), (6, 14, 4, False), (8, 15, 2, False)]

# finished jobs per promoter → levels: 10+ Top, 3+ Rising
JOBS = {'umucyo': 11, 'ikirere': 10, 'kivu': 6, 'kigalimoves': 5, 'imena': 4, 'umuzikiweekly': 3, 'nextup': 3, 'tetastyle': 3,
        'amashusho': 2, 'dancecrew': 2, 'akagera': 2, 'huye': 1, 'nyundo': 1, 'hypehub': 1}
done_plan = {c: [] for c in range(12)}
for key, n in sorted(JOBS.items(), key=lambda kv: -kv[1]):
    for c in sorted(range(12), key=lambda c: (len(done_plan[c]), random.random()))[:n]:
        done_plan[c].append(key)
# running campaigns: promoters across the map, every kind of step
RUN = {
    12: [('umucyo', 'live'), ('ibirunga', 'proof_submitted'), ('lakeside', 'scheduled'), ('dancecrew', 'live'), ('soundnotes', 'booked_ok')],
    13: [('ikirere', 'live'), ('rusizi', 'scheduled'), ('kigalimoves', 'proof_submitted'), ('akagera', 'live'), ('gakwaya', 'booked_ok')],
    14: [('imena', 'live'), ('kivu', 'live'), ('mwiza', 'scheduled'), ('tetastyle', 'scheduled'), ('huye', 'live'), ('hypehub', 'proof_submitted')],
    15: [('nextup', 'booked_ok'), ('umuzikiweekly', 'live'), ('nyundo', 'booked_new'), ('amashusho', 'booked_new')],
}

H = lambda days: round(days * 24)  # hours ago
out = ['-- Tracka example data: 20 promoters + 10 artists. All names are made up.',
       '-- Run AFTER patch-03.sql. Remove it all later with Control room → Settings → "Remove example data".', '']
# promoters
rows = []
for k, name, cat, price, inc, dd, town, about, genres, _ in SELLERS:
    rows.append(f"({q(uid('s', k))}, {q(name)}, {q(cat)}, {price}, {q(inc)}, {dd}, {q(town)}, {q(about)}, {arr(genres)}, 'verified', true, now() - interval '70 days', true, true, 3)")
out.append('insert into public.sellers (id, name, category, price, included, delivery_days, location, description, genres, status, id_checked, verified_at, added_by_admin, is_example, cal_capacity) values\n  ' + ',\n  '.join(rows) + '\non conflict (id) do nothing;')
rows = [f"({q(uid('p', k, pl))}, {q(uid('s', k))}, {pl}, {pr}, {q(note)})" for k, *_r, packs in SELLERS for pl, pr, note in packs]
out.append('insert into public.seller_packages (id, seller_id, plays, price, note) values\n  ' + ',\n  '.join(rows) + '\non conflict (id) do nothing;')
# artists (accounts nobody can log into: no phone, no email)
rows = [f"({q(uid('a', i))}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '{{\"provider\":\"example\"}}', '{{}}', now() - interval '80 days', now())" for i in range(10)]
out.append('insert into auth.users (id, instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values\n  ' + ',\n  '.join(rows) + '\non conflict (id) do nothing;')
out.append('update public.profiles p set display_name = v.n, is_example = true from (values\n  ' + ',\n  '.join(f"({q(uid('a', i))}::uuid, {q(n)})" for i, n in enumerate(ARTISTS)) + '\n) v(id, n) where p.id = v.id;')
# campaigns
rows = []
for c, (a, t, P, fin) in enumerate(CAMPS):
    rows.append(f"({q(uid('c', c))}, {q(uid('a', a))}, {q(TITLES[t])}, {q(GENRE[a])}, {q('completed' if fin else 'active')}, coalesce((select fee_percent from public.settings where id = 1), 0), now() - make_interval(hours => {H(P)}), now() - make_interval(hours => {H(P) - 20}), {f'now() - make_interval(hours => {H(P) - 20 - 24 * 5})' if fin else 'null'}, 'EX{1000 + c}', '0780000000', now() - make_interval(hours => {H(P) + 3}))")
out.append('insert into public.campaigns (id, artist_id, title, genre, status, fee_percent, paid_at, reviewed_at, completed_at, momo_txn, pay_phone, created_at) values\n  ' + ',\n  '.join(rows) + '\non conflict (id) do nothing;')

# bookings: insert (the database sets price + plays), then fill in the story
ins, upd, proofs = [], [], []
def booking(c, key, step):
    a, t, P, fin = CAMPS[c]
    k, name, cat, price, inc, dd, *_x, packs = S[key]
    use = packs[0] if packs and random.random() < 0.4 else None
    plays = use[0] if use else 1
    bid = uid('b', c, key)
    ins.append(f"({q(bid)}, {q(uid('c', c))}, {q(uid('s', key))}, {q(uid('p', key, plays)) if use else 'null'})")
    rev = H(P) - 20                                    # song approved, hours ago
    acc = rev - random.randint(2, 20) if step == 'done' else max(3, round(rev * random.uniform(0.55, 0.85)))
    if step == 'done':
        run0 = max(acc - 24 * random.randint(1, max(1, dd - 1)), 30 + 24 * (plays - 1))   # first play, hours ago
        runs = [run0 - 24 * i for i in range(plays)]
        live = run0
        proof = runs[-1] - 4
        late = key == 'akagera' and c == 2            # one late delivery, so not everyone is perfect
        rated = random.random() < 0.8
        good = key in ('umucyo', 'ikirere') or random.random() < 0.7
        rating = (5 if good else 4) if rated else None
        sets = [f"status = 'paid_out'", f"accepted_at = now() - make_interval(hours => {acc})", f"scheduled_at = now() - make_interval(hours => {acc - 2})",
                f"run_date = (now() - make_interval(hours => {run0}))::date",
                "run_dates = array[" + ",".join(f"(now() - make_interval(hours => {r}))::date" for r in runs) + "]",
                f"live_at = now() - make_interval(hours => {live})", f"proof_at = now() - make_interval(hours => {proof})",
                f"approved_at = now() - make_interval(hours => {max(2, proof - 12)})", f"paid_out_at = now() - make_interval(hours => {max(1, proof - 30)})",
                f"due_date = (now() - make_interval(hours => {proof + 30 if late else proof - 24}))::date"]
        if rating:
            sets += [f"rating = {rating}", f"review = {q(random.choice(REVIEWS))}", f"rated_at = now() - make_interval(hours => {max(0, proof - 40)})"]
        proofs.append(f"({q(uid('pr', c, key))}, {q(bid)}, 'proof', {q('Done: ' + ('played' if cat in ('radio', 'tv', 'dj') else 'posted') + (f' {plays} times' if plays > 1 else '') + '. Thank you!')}, now() - make_interval(hours => {proof}))")
    else:
        sets = []
        if step in ('live', 'proof_submitted'):
            run0 = random.randint(18, 60) + 24 * (plays - 1) if step == 'proof_submitted' else random.randint(8, 40)
            run0 = max(4 + (24 * (plays - 1) + 18 if step == 'proof_submitted' else 0), min(run0, acc - 3))
            runs = [run0 - 24 * i for i in range(plays)]
            sets += [f"status = {q(step)}", f"accepted_at = now() - make_interval(hours => {acc})", f"scheduled_at = now() - make_interval(hours => {acc - 2})",
                     f"run_date = (now() - make_interval(hours => {run0}))::date",
                     "run_dates = array[" + ",".join(f"(now() + make_interval(hours => {-r}))::date" for r in runs) + "]",
                     f"live_at = now() - make_interval(hours => {run0 - 2})", f"due_date = current_date + {plays + 3}"]
            if step == 'proof_submitted':
                sets.append(f"proof_at = now() - make_interval(hours => {max(1, runs[-1] - 6)})")
                proofs.append(f"({q(uid('pr', c, key))}, {q(bid)}, 'proof', {q('Done! Check the time on the screenshot we will add.')}, now() - make_interval(hours => {max(1, runs[-1] - 6)}))")
        elif step == 'scheduled':
            d0 = random.randint(1, 4)
            days = [d0 + 2 * i for i in range(plays)]
            sets += ["status = 'scheduled'", f"accepted_at = now() - make_interval(hours => {acc})", f"scheduled_at = now() - make_interval(hours => {acc - 3})",
                     f"run_date = current_date + {days[0]}", "run_dates = array[" + ",".join(f"current_date + {d}" for d in days) + "]",
                     "want_dates = array[" + ",".join(f"current_date + {d}" for d in days) + "]", f"want_date = current_date + {days[0]}", f"due_date = current_date + {days[-1] + 2}"]
        elif step == 'booked_ok':
            d0 = random.randint(2, 5)
            sets += ["status = 'booked'", f"accepted_at = now() - make_interval(hours => {acc})", f"want_date = current_date + {d0}",
                     "want_dates = array[" + ",".join(f"current_date + {d0 + 2 * i}" for i in range(plays)) + "]", f"due_date = current_date + {d0 + 2 * plays + 2}"]
        else:  # booked_new: approved a few hours ago, waiting for the promoter to accept
            sets += ["status = 'booked'", f"want_date = current_date + 4", "want_dates = array[" + ",".join(f"current_date + {4 + 2 * i}" for i in range(plays)) + "]",
                     f"due_date = current_date + {4 + 2 * plays + 4}"]
    upd.append(f"update public.bookings set {', '.join(sets)} where id = {q(bid)};")

for c in range(12):
    for key in done_plan[c]:
        booking(c, key, 'done')
for c, lst in RUN.items():
    for key, step in lst:
        booking(c, key, step)
out.append('insert into public.bookings (id, campaign_id, seller_id, package_id) values\n  ' + ',\n  '.join(ins) + '\non conflict (id) do nothing;')
out += upd
out.append("""insert into public.proofs (booking_id, kind, note, created_at)
select b.id, 'proof',
       'Done: ' || case when s.category in ('radio', 'tv', 'dj') then 'played' else 'posted' end
              || case when b.plays > 1 then ' ' || b.plays || ' times' else '' end
              || case when b.status = 'proof_submitted' then '. Please check and approve 🙏' else '. Thank you!' end,
       b.proof_at
from public.bookings b join public.sellers s on s.id = b.seller_id
where s.is_example and b.proof_at is not null and not exists (select 1 from public.proofs p where p.booking_id = b.id);""")
# a finished campaign ends when its last promoter was paid
out.append("update public.campaigns c set completed_at = x.t from (select campaign_id, max(paid_out_at) t from public.bookings group by campaign_id) x "
           "where x.campaign_id = c.id and c.status = 'completed' and c.artist_id in (select id from public.profiles where is_example);")
out.append("select (select count(*) from public.sellers where is_example) as example_promoters, (select count(*) from public.profiles where is_example) as example_artists, "
           "(select count(*) from public.campaigns c join public.profiles p on p.id = c.artist_id where p.is_example) as example_songs, "
           "(select count(*) from public.bookings b join public.sellers s on s.id = b.seller_id where s.is_example) as example_bookings;")
open('examples.sql', 'w').write('\n\n'.join(out) + '\n')
print('examples.sql written:', len(ins), 'bookings,', len(proofs), 'proofs,', sum(len(v) for v in done_plan.values()), 'finished jobs')
