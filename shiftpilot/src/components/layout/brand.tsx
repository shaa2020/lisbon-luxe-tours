export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#2563EB" />
      <path d="M9 20.5c1.6 1.4 3.9 2.2 6.4 2.2 3.6 0 6.1-1.7 6.1-4.4 0-2.4-1.8-3.5-5.2-4.2l-1.9-.4c-1.6-.3-2.3-.8-2.3-1.6 0-1 1.1-1.7 2.8-1.7 1.6 0 3 .6 4 1.5l2-2.4C19.4 8.2 17.4 7.4 15 7.4c-3.5 0-5.9 1.8-5.9 4.4 0 2.3 1.6 3.6 5 4.3l1.9.4c1.8.4 2.4.8 2.4 1.7 0 1-1.1 1.7-3 1.7-1.9 0-3.6-.7-4.8-1.9z" fill="#fff" />
    </svg>
  );
}
