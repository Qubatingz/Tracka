import Link from 'next/link';
import Avatar from './Avatar';
import Pill from './Pill';
import LevelBadge from './LevelBadge';
import { catName } from '@/lib/util';
import { createClient } from '@/lib/supabase/server';
import { LEVELS, nextLevel } from '@/lib/levels';

export default async function SellerHead({ seller, profile, photo }: { seller: any; profile: any; photo: string | null }) {
  const st = seller.status;
  const { data: stats } = await createClient().from('seller_stats').select('*').eq('seller_id', seller.id).maybeSingle();
  const next = nextLevel(stats);
  return (
    <>
      <div className="profhead">
        <Avatar name={seller.name} photo={photo} avatar={profile?.avatar} useAvatar={profile?.use_avatar} category={seller.category} size={76} />
        <div className="grow">
          <p className="sub" style={{ margin: 0 }}>
            {catName(seller)}
          </p>
          <h1>{seller.name}</h1>
          <div className="row" style={{ marginTop: 6 }}>
            <Pill st={st === 'verified' ? 'approved' : st === 'pending' ? 'live' : 'declined'} label={st === 'verified' ? 'Verified' : st === 'pending' ? 'Waiting for verification' : st === 'suspended' ? 'Suspended' : 'Not approved'} />
            {st === 'verified' && <LevelBadge st={stats} />}
            <Link href={`/p/${seller.id}`} style={{ fontSize: 15 }}>
              See public profile
            </Link>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost btn-sm" type="submit">
            Log out
          </button>
        </form>
      </div>
      {st === 'verified' && (
        <div className="lvlcard">
          {next ? (
            <>
              <small>
                Next level: <b>{LEVELS[next.to].emoji} {LEVELS[next.to].name}</b>
              </small>
              <div className="meter" role="progressbar" aria-valuenow={next.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${LEVELS[next.to].name}`}>
                <span style={{ width: Math.max(next.pct, 4) + '%' }} />
              </div>
              <small>{next.todo.length ? 'Still needed: ' + next.todo.join(', ') : 'Almost there!'}</small>
            </>
          ) : (
            <small>
              <b>🏆 You are a Top Promoter.</b> Artists see it on your profile. Keep it up!
            </small>
          )}
        </div>
      )}
    </>
  );
}
