import Link from 'next/link';

export default function SellerTabs({ active, todo = 0 }: { active: string; todo?: number }) {
  const tabs: [string, string][] = [
    ['/seller', 'Bookings'],
    ['/seller/calendar', 'Calendar'],
    ['/seller/profile', 'Profile'],
    ['/seller/money', 'Money'],
  ];
  return (
    <nav className="tabs" aria-label="Seller menu">
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}>
          {label}
          {href === '/seller' && todo ? <span className="tcount">{todo}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
