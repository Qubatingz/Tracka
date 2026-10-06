import Link from 'next/link';
import Icon from '@/components/Icon';
import SellerSignupForm from '@/components/SellerSignupForm';
import { getMe, getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

const BENEFITS = [
  ['shield', 'Verified badge', 'Artists trust you from day one.'],
  ['tag', 'Your price', 'You set it. Artists see it before they book.'],
  ['phone', 'Paid on MoMo', 'No chasing artists for money.'],
  ['star', 'Reviews', 'Good work builds your name.'],
];

export default async function Sell() {
  const { supabase, user, seller } = await getMe();
  const settings = await getSettings(supabase);
  const { data: cats } = await supabase.from('categories').select('*').order('sort');
  const open = (cats || []).filter((c: any) => c.is_open && c.key !== 'other');

  return (
    <div className="page">
      <section className="joinhero">
        <div>
          <h1>
            Get booked. <em>Get paid.</em>
          </h1>
          <p className="sub">Radio, TV, TikTok, YouTube, blogs, influencers, DJs: artists are looking for you.</p>
        </div>
      </section>
      <div className="benefits">
        {BENEFITS.map(([icon, title, text]) => (
          <div className="ben" key={title}>
            <Icon name={icon} size={28} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <h2 className="st">Sell your service.</h2>
      {!user ? (
        <div className="panel">
          <p style={{ marginTop: 0 }}>First, log in with your phone number. It takes 30 seconds.</p>
          <Link className="btn btn-yellow" href="/login?next=/sell">
            Log in to start
          </Link>
        </div>
      ) : seller ? (
        <div className="panel">
          <p style={{ marginTop: 0 }}>You already sell on Tracka as <b>{seller.name}</b>.</p>
          <Link className="btn btn-yellow" href="/seller">
            Go to my dashboard
          </Link>
        </div>
      ) : (
        <SellerSignupForm cats={open.map((c: any) => ({ key: c.key, name: c.name }))} allowCustom={!!settings.allow_custom} rules={settings.rules_seller || []} />
      )}
    </div>
  );
}
