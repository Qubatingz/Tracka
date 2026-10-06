import Icon from './Icon';

// Shows a proof (screenshot, video, link, note). urls = signed links for private files.
export default function ProofView({ p, urls, big }: { p: any; urls: Record<string, string>; big?: boolean }) {
  if (!p) return null;
  const img = p.image_path ? urls[p.image_path] : null;
  const vid = p.video_path ? urls[p.video_path] : null;
  return (
    <div className={'proofs' + (big ? ' big' : '')}>
      {img && (
        <a className="proofimg" href={img} target="_blank" rel="noopener noreferrer" aria-label="Open the screenshot bigger">
          <img src={img} alt="Screenshot proof" />
          <span className="zoomtag">
            <Icon name="eye" size={14} />
            Tap to open
          </span>
        </a>
      )}
      {vid && <video className="proofvid" controls playsInline preload="metadata" src={vid} aria-label="Video proof" />}
      {p.link && (
        <a className="proofchip" href={p.link} target="_blank" rel="noopener noreferrer">
          <Icon name="arrow" size={16} />
          Open the post
        </a>
      )}
      {p.note && <p className="proofnote">“{p.note}”</p>}
    </div>
  );
}
