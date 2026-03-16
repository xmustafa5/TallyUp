import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export class Password {
  private constructor(public readonly hash: string) {}

  static async fromPlainText(plainText: string): Promise<Password> {
    if (!plainText || plainText.length < MIN_LENGTH) {
      throw new Error(`Password must be at least ${MIN_LENGTH} characters`);
    }

    if (plainText.length > MAX_LENGTH) {
      throw new Error(`Password must not exceed ${MAX_LENGTH} characters`);
    }

    const hash = await bcrypt.hash(plainText, SALT_ROUNDS);
    return new Password(hash);
  }

  static fromHash(hash: string): Password {
    return new Password(hash);
  }

  async verify(plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, this.hash);
  }
}
