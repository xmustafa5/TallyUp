'use client';

interface MilestoneBannerProps {
  milestone: string | null;
}

export function MilestoneBanner({ milestone }: MilestoneBannerProps) {
  if (!milestone) {
    return null;
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-4 text-green-600 dark:text-green-400"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {milestone}
        </p>
      </div>
    </div>
  );
}
