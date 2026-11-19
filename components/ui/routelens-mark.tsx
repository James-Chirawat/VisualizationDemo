/**
 * RouteLens brand mark: a route runs into the stop the lens is focused on.
 * Lens and route use `currentColor`; the stop uses --brand-stop. Masters live in public/brand/.
 * Uses the small-size cut, since in the UI it renders at 32 px or less.
 */
export function RouteLensMark({ size = 24, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 256 256" className={className} aria-hidden="true" focusable="false">
    <g transform="translate(2 -4)">
      <path fill="currentColor" fillRule="evenodd" d="M128 34a94 94 0 1 0 0 188a94 94 0 1 0 0-188Zm0 34a60 60 0 1 1 0 120a60 60 0 1 1 0-120Z" />
      <rect x="-17" y="0" width="34" height="132" rx="17" fill="currentColor" transform="translate(128 128) rotate(45)" />
      <circle cx="128" cy="128" r="32" fill="var(--brand-stop)" />
    </g>
  </svg>;
}
