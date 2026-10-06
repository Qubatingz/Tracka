import { ICON } from '@/lib/icons';

export default function Icon({ name, size = 22, sw = 2 }: { name: string; size?: number; sw?: number }) {
  return (
    <svg
      className="ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICON[name] || ICON.other }}
    />
  );
}
