const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(public readonly value: string) {}

  static create(email: string): Email {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Email is required');
    }

    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error('Invalid email format');
    }

    if (normalized.length > 255) {
      throw new Error('Email must not exceed 255 characters');
    }

    return new Email(normalized);
  }
}
