'use client';

import { useRef, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface InlineTextProps {
  value: string;
  onSave: (next: string) => Promise<void>; // throw to stay in edit mode after toasting
  editLabel?: string; // aria-label of pencil button; E2E-13 expects 'edit'
  className?: string;
}

/**
 * Inline display → click pencil → live input → Enter/Check to save, Escape/X to cancel.
 * Root is flex-1 so it stretches to fill its row and the edit icon sits at the far right.
 * Parent should toast on error and re-throw so the component stays in edit mode.
 */
export function InlineText({ value, onSave, editLabel = 'edit', className = '' }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    // focus + select after render
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  async function confirm() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      // parent has toasted; stay in edit mode
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void confirm();
    if (e.key === 'Escape') cancel();
  }

  if (!editing) {
    return (
      <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
        {/* flex-1 pushes the pencil to the far right of the row */}
        <span className={`min-w-0 flex-1 truncate ${className}`}>{value}</span>
        <button
          type="button"
          aria-label={editLabel}
          onClick={startEdit}
          className="shrink-0 p-1 text-faint transition-colors hover:text-accent"
        >
          <Pencil size={14} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
      <input
        ref={inputRef}
        data-testid="inline-edit-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-w-0 flex-1 border border-line bg-canvas px-2 py-0.5 font-body text-xs text-ink outline-none focus:border-accent"
      />
      <button
        type="button"
        aria-label="Save changes"
        disabled={saving}
        onClick={() => void confirm()}
        className="shrink-0 p-1 text-success transition-colors hover:text-success disabled:opacity-40"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        aria-label="Cancel editing"
        disabled={saving}
        onClick={cancel}
        className="shrink-0 p-1 text-faint transition-colors hover:text-danger disabled:opacity-40"
      >
        <X size={14} />
      </button>
    </span>
  );
}
