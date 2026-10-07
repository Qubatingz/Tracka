import Link from 'next/link';
import Avatar from './Avatar';
import Icon from './Icon';

export type Hot = { campaign_id: string; title: string; genre: string; artist_name: string; photo: string | null; avatar: any; use_avatar: boolean; promoters: number; channels: number; plays: number };

// "Hot on Tracka this week": songs that went out, ranked by plays.
export default function HotList({ songs }: { songs: Hot[] }) {
  const top = Math.max(1, ...songs.map((s) => s.plays));
  return (
    <section className="band" aria-labelledby="hot-h">
      <div className="band-in">
        <p className="kicker">This week</p>
        <h2 className="sech" id="hot-h">
          Hot on Tracka 🔥
        </h2>
        {songs.length ? (
          <ol className="hotlist">
            {songs.map((s, i) => (
              <li className="hot" key={s.campaign_id}>
                <span className="rank" aria-label={`Number ${i + 1}`}>
                  {i + 1}
                </span>
                <Avatar name={s.artist_name || 'Artist'} photo={s.photo} avatar={s.avatar} useAvatar={s.use_avatar} size={48} />
                <span>
                  <strong>“{s.title}”</strong>
                  <small>
                    {s.artist_name || 'An artist'}
                    {s.genre ? ' · ' + s.genre : ''}
                  </small>
                </span>
                <span className="heat">
                  {s.plays} {s.plays === 1 ? 'play' : 'plays'} · {s.promoters} {s.promoters === 1 ? 'promoter' : 'promoters'}
                  <span className="heatbar" aria-hidden="true">
                    <span style={{ width: Math.round((s.plays / top) * 100) + '%' }} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="hotempty">
            <p style={{ margin: 0 }}>
              <b>No songs out yet this week.</b> The first one to go live takes the #1 spot. 👀
            </p>
            <p style={{ margin: '12px 0 0' }}>
              <Link className="btn btn-yellow btn-sm" href="/artist/new">
                <Icon name="note" size={16} /> Start a campaign
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
