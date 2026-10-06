import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Terms() {
  const s = await getSettings(createClient());
  const fee = Number(s.fee_percent) || 0;
  const co = s.company || 'Tracka';
  const mail = s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : 'our email (shown on the home page)';
  const list = (rules: string[]) => (
    <ol className="rules">
      {(rules || []).map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ol>
  );
  const sections: [string, React.ReactNode][] = [
    ['About Tracka', <><p>Tracka is an online marketplace in Rwanda. Artists book promoters and DJs (“sellers”) to promote their music. {co}{s.rdb ? ` (RDB ${s.rdb})` : ''} runs Tracka. We are not the seller: each seller is responsible for their own service.</p><p>By using Tracka, you agree to these terms. If you don’t agree, please don’t use Tracka.</p></>],
    ['Your account', <><p>You log in with your phone number and a code we send by SMS. Keep the code private. One account per person or business. Give true information. You must be 18 or older, or have a parent or guardian’s permission.</p><p>You choose how we notify you: SMS, WhatsApp or email.</p></>],
    ['For artists', <>{list(s.rules_artist)}<p>Only upload music you own, or have permission to promote. You are responsible for your song.</p></>],
    ['For sellers (promoters and DJs)', <>{list(s.rules_seller)}<p>Before you can sell, we check your ID and your pages. Answer every booking within 48 hours: accept or decline. Deliver what your offer says, on the date you set.</p></>],
    ['Song check', <p>Our team listens to every song before sellers get it, usually within 1 working day. We can ask for a new version, or refuse songs that break these terms.</p>],
    ['Payments and held money', <><p>You pay once for the whole campaign, with MoMo or another method we show. Tracka holds the money. Each seller is paid only after their proof is approved.</p><p>{fee ? `Tracka’s service fee is ${fee}% and is shown before you pay.` : 'Any service fee is always shown before you pay.'}</p><p>Sellers are paid on MoMo, usually within 3 working days after approval. Everyone is responsible for their own taxes.</p></>],
    ['Refunds', <><p><b>You always get the money back for a booking when:</b> the seller declines, doesn’t accept within 48 hours, or sends no proof by the due date.</p><p><b>Changed your mind after paying?</b> Email us at {mail}. It depends on what the seller has already done:</p><table className="rtable reftable"><thead><tr><th>The booking is…</th><th>Refund</th></tr></thead><tbody><tr><td>Not accepted by the seller yet</td><td>✅ Yes</td></tr><tr><td>Accepted, but not played or posted yet</td><td>🤝 Our team decides. We may refund part (for example 50%) so the seller is paid for their time</td></tr><tr><td>Already played or posted</td><td>❌ No. The work is done</td></tr></tbody></table><p>Refunds go back to the MoMo number you paid from.</p></>],
    ['Proof and approval', <p>Sellers send proof: a screenshot, a video or a link. You can approve it, or report a problem within 3 days. If you don’t answer, our team checks the proof and may approve it.</p>],
    ['Problems and decisions', <p>If you report a problem, the money stays held. The seller can answer with more proof. Our team looks at both sides and decides: pay the seller, or refund the artist. Our decision is final inside Tracka.</p>],
    ['Tips', <p>Tips are optional. 100% of a tip goes to the seller.</p>],
    ['Not allowed on Tracka', <p>Fake streams, bots, bought followers or views. Fake proof. Asking to be paid outside Tracka for a Tracka booking. Hate, threats or harassment. Using someone else’s name, photo or ID. Breaking the law.</p>],
    ['Who owns what', <p>Artists keep all rights to their music. When you book, you allow the seller to play or post your song for that booking. Sellers keep the rights to the content they make. By sending proof, sellers and artists allow Tracka to show approved results (“Finished work”) on the seller’s profile.</p>],
    ['Reviews and the Trusted badge', <p>Only artists who booked can rate a seller. Reviews must be honest. The Trusted badge is given automatically by our rules (ID checked, 3+ jobs, 90% on time, 4.5★ or more, no refunded problems) and can be removed.</p>],
    ['Your data and your ID', <p>We use your data only to run Tracka. IDs are private: only the Tracka team sees them, never on a profile. We don’t sell your data.</p>],
    ['Suspension', <p>We can suspend or close an account that breaks these terms. Open bookings are then finished or refunded fairly.</p>],
    ['Our responsibility', <p>Tracka connects artists and sellers and holds the money until proof. We don’t promise a number of streams, views or fans. If something goes wrong because of us, our responsibility is limited to the money you paid for that booking.</p>],
    ['Changes to these terms', <p>We may update these terms. We will tell you by your chosen notifications before big changes take effect.</p>],
    ['Law', <p>These terms follow the laws of Rwanda. If there is a disagreement, we first try to solve it together by email. If that fails, the competent courts of Rwanda decide.</p>],
    ['Contact', <p>Questions? Email {mail}.</p>],
  ];
  const short = [
    'Your money is held until you see proof.',
    'Seller declines, doesn’t answer in 48h, or no proof? Money back.',
    'Changed your mind? Email us. Refund only if the seller hasn’t played or posted yet.',
    'Our team checks every song and every seller’s ID.',
    'No fake streams, no fake proof, no payments outside Tracka.',
  ];
  return (
    <div className="page narrow">
      <div className="head">
        <div>
          <h1>Terms and conditions.</h1>
          <p className="sub">Tap a section to open it.</p>
        </div>
      </div>
      <div className="tshort">
        <strong>The short version</strong>
        <ul>
          {short.map((x) => (
            <li key={x}>
              <span>✓</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="faq terms">
        {sections.map(([title, body], i) => (
          <details key={title} id={`t${i + 1}`}>
            <summary>
              {i + 1}. {title}
            </summary>
            <div className="tbody">{body}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
