'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, ext, myId } from '@/lib/upload';
import { isUrl } from '@/lib/util';

export default function NewVersionForm({ campaignId, version }: { campaignId: string; version: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fileName, setFileName] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file') as File | null;
    const link = String(fd.get('link') || '').trim();
    if ((!file || !file.size) && !isUrl(link)) return setErr('Upload the new version or paste a link.');
    setBusy(true);
    setErr('');
    try {
      let path: string | null = null;
      if (file && file.size) path = await uploadFile('songs', `${await myId()}/${campaignId}/v${version}.${ext(file, 'mp3')}`, file);
      const { error } = await createClient().rpc('send_new_version', { p_campaign: campaignId, p_song_path: path, p_link: link });
      if (error) throw new Error(error.message);
      router.refresh();
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit} style={{ marginTop: 10, width: '100%' }}>
      <label className="filepick">
        <span className="flab">New version of the song</span>
        <input className="vh" type="file" name="file" accept="audio/*" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
        <span className="fbtn">
          <Icon name="note" size={20} />
          Choose a file
        </span>
        <span className={'fname' + (fileName ? ' has' : '')}>{fileName || 'No file chosen'}</span>
      </label>
      <label className="label">
        Or paste a link
        <input className="input" name="link" type="url" placeholder="https://" />
      </label>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send new version'}
        </button>
      </div>
      {err && <small className="rpcerr">{err}</small>}
    </form>
  );
}
