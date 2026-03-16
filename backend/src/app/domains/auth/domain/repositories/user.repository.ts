import type { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  existsByEmail(email: string): Promise<boolean>;
}
