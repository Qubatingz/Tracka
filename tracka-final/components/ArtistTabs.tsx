import Link from 'next/link';

export default function ArtistTabs({ active }: { active: string }) {
  const tabs: [string, string][] = [
    ['/artist', 'Overview'],
    ['/artist/new', 'New campaign'],
    ['/artist/settings', 'Settings'],
  ];
  return (
    <nav className="tabs" aria-label="Artist menu">
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
