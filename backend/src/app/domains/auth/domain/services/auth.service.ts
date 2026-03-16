import type { User } from '../entities/user.entity';
import type { UserRepository } from '../repositories/user.repository';
import { Email } from '../value-objects/email';
import { Password } from '../value-objects/password';

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
}

export async function registerUser(
  input: RegisterInput,
  userRepository: UserRepository,
): Promise<AuthResult> {
  const email = Email.create(input.email);

  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Name is required');
  }

  if (input.name.trim().length > 255) {
    throw new Error('Name must not exceed 255 characters');
  }

  const exists = await userRepository.existsByEmail(email.value);
  if (exists) {
    throw new Error('Email already registered');
  }

  const password = await Password.fromPlainText(input.password);

  const user = await userRepository.create({
    email: email.value,
    name: input.name.trim(),
    passwordHash: password.hash,
  });

  return { user };
}

export async function loginUser(
  input: LoginInput,
  userRepository: UserRepository,
): Promise<AuthResult> {
  const email = Email.create(input.email);

  const user = await userRepository.findByEmail(email.value);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  if (!user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const password = Password.fromHash(user.passwordHash);
  const isValid = await password.verify(input.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  return { user };
}
