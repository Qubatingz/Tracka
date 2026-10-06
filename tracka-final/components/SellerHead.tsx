import Link from 'next/link';
import Avatar from './Avatar';
import Pill from './Pill';
import { catName } from '@/lib/util';

export default function SellerHead({ seller, profile, photo }: { seller: any; profile: any; photo: string | null }) {
  const st = seller.status;
  return (
    <div className="profhead">
      <Avatar name={seller.name} photo={photo} avatar={profile?.avatar} useAvatar={profile?.use_avatar} category={seller.category} size={76} />
      <div className="grow">
        <p className="sub" style={{ margin: 0 }}>
          {catName(seller)}
        </p>
        <h1>{seller.name}</h1>
        <div className="row" style={{ marginTop: 6 }}>
          <Pill st={st === 'verified' ? 'approved' : st === 'pending' ? 'live' : 'declined'} label={st === 'verified' ? 'Verified' : st === 'pending' ? 'Waiting for verification' : st === 'suspended' ? 'Suspended' : 'Not approved'} />
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
  );
}
