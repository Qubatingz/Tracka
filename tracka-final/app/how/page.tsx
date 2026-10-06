import Link from 'next/link';
import Icon from '@/components/Icon';

const ARTIST = [
  ['upload', 'Add your song', 'Upload the file or paste a link. Add a genre so promoters know your sound.'],
  ['users', 'Pick your promoters and dates', 'Every promoter is verified. See their price, what’s included, their free days and reviews first.'],
  ['phone', 'Pay once', 'One MoMo payment covers every promoter in your campaign.'],
  ['note', 'We listen to your song', 'Our team checks every song before promoters get it.'],
  ['lock', 'We hold your money', 'Nobody is paid yet. Each promoter must accept within 48 hours and deliver by their due date.'],
  ['eye', 'Check the proof', 'Promoters send a screenshot, a video or a link. Tap Looks good, or report a problem.'],
  ['star', 'Rate them', 'Your stars help other artists choose.'],
];
const SELLER = [
  ['shield', 'Join and get verified', 'Tell us what you offer, share your page and your price, and add your ID.'],
  ['note', 'Get booked', 'When an artist pays and we approve the song, the booking appears in your dashboard.'],
  ['check', 'Accept within 48 hours', 'Then pick the date it will run.'],
  ['upload', 'Deliver and send proof', 'Play or post the song, then send a screenshot, a video or a link.'],
  ['phone', 'Get paid on MoMo', 'Once the proof is approved, we send your money.'],
];

export default function How({ searchParams }: { searchParams: { for?: string } }) {
  const seller = searchParams.for === 'seller';
  const steps = seller ? SELLER : ARTIST;
  return (
    <div className="page">
      <div className="head">
        <div>
          <h1>How Tracka works.</h1>
          <p className="sub">Simple for artists. Fair for promoters.</p>
        </div>
      </div>
      <div className="seg" role="group" aria-label="Show steps for">
        <Link href="/how" aria-current={!seller ? 'true' : undefined} style={!seller ? { background: 'var(--paper)', fontWeight: 600, borderRadius: 999, padding: '10px 18px' } : { padding: '10px 18px' }}>
          For artists
        </Link>
        <Link href="/how?for=seller" aria-current={seller ? 'true' : undefined} style={seller ? { background: 'var(--paper)', fontWeight: 600, borderRadius: 999, padding: '10px 18px' } : { padding: '10px 18px' }}>
          For promoters
        </Link>
      </div>
      <ol className="hsteps">
        {steps.map(([icon, title, text], i) => (
          <li className="hstep" key={title}>
            <span className="hnum">{i + 1}</span>
            <div className="hico">
              <Icon name={icon} size={26} />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="row" style={{ marginTop: 32 }}>
        <Link className="btn btn-yellow" href={seller ? '/sell' : '/artist/new'}>
          {seller ? 'Join as a promoter' : 'Start a campaign'}
        </Link>
        <Link className="morelink" href="/terms">
          Terms and conditions <Icon name="arrow" size={18} />
        </Link>
      </div>
    </div>
  );
}
