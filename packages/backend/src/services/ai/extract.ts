import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '@reka-bytes/shared';
// pdf-parse v2 — ESM class API (PDFParse). Verified at install time.
import { PDFParse } from 'pdf-parse';

const UPLOAD_DIR = path.join(tmpdir(), 'reka-bytes-ai-uploads');

/** Magic-byte check + size guard, then persist the upload for the job. */
export function assertPdf(buffer: Buffer) {
  const header = buffer.subarray(0, 5).toString('latin1');
  if (!header.startsWith('%PDF-')) {
    throw AppError.badRequest('File is not a valid PDF');
  }
}

export async function saveUpload(buffer: Buffer): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, `${randomUUID()}.pdf`);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function deleteUpload(filePath: string): Promise<void> {
  await unlink(filePath).catch(() => undefined);
}

/** Extract raw text from a saved PDF. The pipeline chunks it — nothing is truncated. */
export async function extractText(filePath: string): Promise<string> {
  let parser: import('pdf-parse').PDFParse | null = null;
  try {
    const data = new Uint8Array(await readFile(filePath));
    parser = new PDFParse({ data });
    const result = await parser.getText();
    return result.text;
  } catch {
    throw AppError.badRequest('Could not read the PDF — is it password-protected or corrupt?');
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
