import { cn } from '@/lib/utils';
import { typeStyles } from '@reka-bytes/shared';

interface SectionHeaderProps {
  index: string; // e.g. "01"
  name: string; // e.g. "WHY"
  title: string;
  className?: string;
}

/** `[mono label 01 / NAME]` above a display title, hairline underneath. */
export function SectionHeader({ index, name, title, className }: SectionHeaderProps) {
  const t = typeStyles;
  return (
    <header className={cn('border-b border-line pb-10', className)}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
        {index} / {name}
      </p>
      <h2 className={cn(t.displayM, 'mt-5 max-w-2xl')}>{title}</h2>
    </header>
  );
}
