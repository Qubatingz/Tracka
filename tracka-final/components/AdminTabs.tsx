import Link from 'next/link';

export default function AdminTabs({ active, counts = {} as Record<string, number> }: { active: string; counts?: Record<string, number> }) {
  const tabs: [string, string][] = [
    ['/admin', 'To do'],
    ['/admin/promoters', 'Promoters'],
    ['/admin/payments', 'Payments'],
    ['/admin/songs', 'Songs'],
    ['/admin/proofs', 'Submissions'],
    ['/admin/payouts', 'Payouts'],
    ['/admin/settings', 'Settings'],
  ];
  return (
    <nav className="tabs" aria-label="Admin menu">
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}>
          {label}
          {counts[href] ? <span className="tcount">{counts[href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
