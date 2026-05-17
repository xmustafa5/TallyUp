import { randomInt } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const FALLBACK_PREFIX = 'USR';
const MAX_RETRIES = 10;

/**
 * Derive a 3-letter prefix from a display name: strip diacritics, keep
 * ASCII letters, uppercase, take the first 3. Pads with `X` when shorter
 * than 3. Falls back to `USR` for non-Latin / emoji-only names.
 */
export function derivePrefix(displayName: string): string {
  const ascii = displayName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();

  if (ascii.length === 0) return FALLBACK_PREFIX;
  return ascii.slice(0, 3).padEnd(3, 'X');
}

function randomSuffix(digits: number): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return String(randomInt(min, max + 1));
}

/**
 * Generate a unique, human-readable public User ID (e.g. `ALI-2941`).
 *
 * Strategy: derive a 3-letter prefix from the display name, then attach a
 * random 4-digit suffix. On collision, regenerate the suffix; after
 * MAX_RETRIES, widen to a 5-digit suffix. Pure read against the DB -- the
 * caller is responsible for the actual user insert (which still carries a
 * unique constraint as the final guard).
 */
export async function generatePublicId(
  prisma: PrismaClient,
  displayName: string,
): Promise<string> {
  const prefix = derivePrefix(displayName);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = `${prefix}-${randomSuffix(4)}`;
    const existing = await prisma.user.findUnique({
      where: { publicId: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  // Namespace for this prefix is congested -- widen the suffix.
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = `${prefix}-${randomSuffix(5)}`;
    const existing = await prisma.user.findUnique({
      where: { publicId: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error('Unable to generate a unique public ID');
}
