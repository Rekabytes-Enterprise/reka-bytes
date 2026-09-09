import { cn } from '@/lib/utils';
import { typeStyles } from '@reka-bytes/shared';

interface SectionHeaderProps {
  /**
   * Optional section-number prefix, e.g. "01" or "§01". When omitted, the
   * "{index} / {name}" label line is skipped and only the title is rendered.
   * The numbering pattern has been retired from the product; this prop is
   * kept optional in case a future surface wants it back.
   */
  index?: string;
  name: string;
  title: string;
  className?: string;
}

/** A bordered section header — name + display title, hairline underneath. */
export function SectionHeader({ index, name, title, className }: SectionHeaderProps) {
  const t = typeStyles;
  return (
    <header className={cn('border-b border-line pb-10', className)}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
        {index ? `${index} / ${name}` : name}
      </p>
      <h2 className={cn(t.displayM, 'mt-5 max-w-2xl')}>{title}</h2>
    </header>
  );
}
