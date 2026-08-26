const TERMS = [
  'ARCHITECTURE',
  'DEBUGGING',
  'GIT & VERSIONING',
  'APIS',
  'DATABASES',
  'PROMPTING',
  'SECURITY',
  'DEPLOYMENT',
];

/** Infinite mono ticker strip separating landing sections. */
export function Ticker() {
  const items = [...TERMS, ...TERMS]; // duplicated for seamless -50% loop
  return (
    <div className="overflow-hidden border-y border-line bg-elevated py-3" aria-hidden>
      <div className="ticker-track flex w-max gap-8">
        {items.map((term, i) => (
          <span
            key={`${term}-${i}`}
            className="flex items-center gap-8 font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint"
          >
            {term} <span className="text-accent-dim">→</span>
          </span>
        ))}
      </div>
    </div>
  );
}
