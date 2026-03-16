import { describe, it, expect } from 'vitest';
import { Email } from '../../../src/app/domains/auth/domain/value-objects/email';
import { Password } from '../../../src/app/domains/auth/domain/value-objects/password';

describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const email = Email.create('Test@Example.COM');
    expect(email.value).toBe('test@example.com');
  });

  it('should trim whitespace', () => {
    const email = Email.create('  user@test.com  ');
    expect(email.value).toBe('user@test.com');
  });

  it('should throw for empty email', () => {
    expect(() => Email.create('')).toThrow('Email is required');
  });

  it('should throw for invalid format', () => {
    expect(() => Email.create('not-an-email')).toThrow('Invalid email format');
  });

  it('should throw for email exceeding 255 chars', () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    expect(() => Email.create(longEmail)).toThrow('Email must not exceed 255 characters');
  });
});

describe('Password Value Object', () => {
  it('should hash a valid password', async () => {
    const password = await Password.fromPlainText('SecurePass123');
    expect(password.hash).toBeDefined();
    expect(password.hash).not.toBe('SecurePass123');
  });

  it('should verify a correct password', async () => {
    const password = await Password.fromPlainText('SecurePass123');
    const isValid = await password.verify('SecurePass123');
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = await Password.fromPlainText('SecurePass123');
    const isValid = await password.verify('WrongPassword');
    expect(isValid).toBe(false);
  });

  it('should throw for password shorter than 8 characters', async () => {
    await expect(Password.fromPlainText('short')).rejects.toThrow(
      'Password must be at least 8 characters',
    );
  });

  it('should throw for password exceeding 128 characters', async () => {
    const longPassword = 'a'.repeat(129);
    await expect(Password.fromPlainText(longPassword)).rejects.toThrow(
      'Password must not exceed 128 characters',
    );
  });

  it('should create from existing hash', () => {
    const hash = '$2b$12$fakehashvalue';
    const password = Password.fromHash(hash);
    expect(password.hash).toBe(hash);
  });
});
