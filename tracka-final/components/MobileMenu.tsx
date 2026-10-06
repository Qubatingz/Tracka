'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="menubtn" type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div className="mobilemenu" onClick={() => setOpen(false)}>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/how">How it works</Link>
          <Link href="/sell">Sell on Tracka</Link>
          <Link href="/terms">Terms and conditions</Link>
        </div>
      )}
    </>
  );
}
