/**
 * Splits extracted PDF text into numbered, overlapping chunks for the BAML
 * pipeline. Replaces the old hard truncation at AI_MAX_INPUT_CHARS (which
 * silently dropped content past 60k chars).
 */
const CHUNK_SIZE = 4000;
const OVERLAP = 300;
export const MAX_CHUNKS = 40; // bounds cost: 40 × ~1k tokens ≈ manageable per call

export interface SourceChunk {
  index: number;
  text: string;
}

/** Split on paragraph boundaries where possible; fall back to hard cut. */
export function chunkText(sourceText: string): SourceChunk[] {
  const trimmed = sourceText.trim();
  if (!trimmed) return [];

  const paragraphs = trimmed.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    // A single paragraph bigger than a chunk gets hard-split.
    if (para.length > CHUNK_SIZE) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      for (let i = 0; i < para.length; i += CHUNK_SIZE - OVERLAP) {
        chunks.push(para.slice(i, i + CHUNK_SIZE).trim());
      }
      continue;
    }
    if (current.length + para.length + 2 > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim());
      // overlap: carry the tail of the previous chunk into the next
      current = `${current.slice(-OVERLAP)}\n\n${para}`;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.slice(0, MAX_CHUNKS).map((text, index) => ({ index, text }));
}
