'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Avatar from './Avatar';
import { createClient } from '@/lib/supabase/client';
import { shrinkImage } from '@/lib/image';
import { uploadFile } from '@/lib/upload';

const NOTIF: [string, string, string][] = [
  ['sms', 'SMS', 'phone'],
  ['whatsapp', 'WhatsApp', 'chat'],
  ['email', 'Email', 'blog'],
];

// Name, email, notification choices and picture. Used by artists and sellers.
export default function ProfileSettingsForm({ profile, photoUrl, back, hideName }: { profile: any; photoUrl: string | null; back: string; hideName?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [fileName, setFileName] = useState('');
  const notify: string[] = profile?.notify || ['sms'];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const chosen = NOTIF.map((x) => x[0]).filter((k) => fd.get('nt_' + k));
    const email = String(fd.get('email') || '').trim();
    if (chosen.includes('email') && !email) return setMsg({ text: 'Add your email to get notifications by email.', err: true });
    setBusy(true);
    try {
      const supabase = createClient();
      const patch: any = { email: email || null, notify: chosen.length ? chosen : ['sms'] };
      if (!hideName) patch.display_name = String(fd.get('name') || '').trim().slice(0, 60);
      const show = String(fd.get('show') || '');
      if (show) patch.use_avatar = show === 'avatar';
      const file = fd.get('photo') as File | null;
      if (file && file.size) {
        const small = await shrinkImage(file, 600);
        patch.photo_path = await uploadFile('faces', `${profile.id}/photo-${Date.now()}.jpg`, small);
        patch.use_avatar = false;
      }
      const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id);
      if (error) throw new Error(error.message);
      setMsg({ text: 'Saved ✓' });
      setFileName('');
      router.refresh();
    } catch (x: any) {
      setMsg({ text: x.message, err: true });
    }
    setBusy(false);
  }

  return (
    <form className="form" onSubmit={submit}>
      {msg && (
        <p className={'notice' + (msg.err ? ' err' : '')} role={msg.err ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}
      {!hideName && (
        <label className="label">
          Artist name
          <input className="input" name="name" defaultValue={profile?.display_name || ''} />
        </label>
      )}
      <label className="label">
        Phone number (you log in with it)
        <input className="input" value={profile?.phone ? '+' + String(profile.phone).replace(/^\+/, '') : ''} readOnly />
      </label>
      <label className="label">
        Email (optional)
        <input className="input" name="email" type="email" defaultValue={profile?.email || ''} />
      </label>
      <div className="label" id="nt-l">
        Send my notifications by
      </div>
      <div className="row" role="group" aria-labelledby="nt-l">
        {NOTIF.map(([k, label, icon]) => (
          <label className="tipchip" key={k}>
            <input type="checkbox" name={'nt_' + k} defaultChecked={notify.includes(k)} />
            <span>
              <Icon name={icon} size={16} /> {label}
            </span>
          </label>
        ))}
      </div>
      <fieldset className="fset">
        <legend>
          <Icon name="user" size={18} /> Your picture
        </legend>
        <div className="row" style={{ gap: 16 }}>
          <Avatar name={profile?.display_name || 'Me'} photo={photoUrl} avatar={profile?.avatar} useAvatar={profile?.use_avatar} size={72} />
          <p className="hint" style={{ flex: '1 1 200px', margin: 0 }}>
            Use a real photo, or make an avatar. A real face builds more trust.
          </p>
        </div>
        <label className="filepick">
          <span className="flab">Upload a photo</span>
          <input className="vh" type="file" name="photo" accept="image/*" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
          <span className="fbtn">
            <Icon name="user" size={20} />
            Choose a file
          </span>
          <span className={'fname' + (fileName ? ' has' : '')}>{fileName || 'No file chosen'}</span>
        </label>
        <div className="row">
          <Link className="btn btn-ghost btn-sm" href={`/me?back=${encodeURIComponent(back)}`}>
            {profile?.avatar ? 'Edit my avatar' : 'Make an avatar instead'}
          </Link>
        </div>
        {profile?.avatar && profile?.photo_path && (
          <div className="row" role="radiogroup" aria-label="Show on my profile">
            <label className="tipchip">
              <input type="radio" name="show" value="photo" defaultChecked={!profile.use_avatar} />
              <span>Show my photo</span>
            </label>
            <label className="tipchip">
              <input type="radio" name="show" value="avatar" defaultChecked={!!profile.use_avatar} />
              <span>Show my avatar</span>
            </label>
          </div>
        )}
      </fieldset>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
