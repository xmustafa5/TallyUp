import type { AuthProvider } from '@prisma/client';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  birthdate: Date | null;
  pubertyAge: number | null;
  provider: AuthProvider;
  providerId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  birthdate: string | null;
  pubertyAge: number | null;
  provider: AuthProvider;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static fromPrisma(data: UserProps): User {
    return new User(data);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get birthdate(): Date | null {
    return this.props.birthdate;
  }

  get pubertyAge(): number | null {
    return this.props.pubertyAge;
  }

  get provider(): AuthProvider {
    return this.props.provider;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  toResponse(): UserResponse {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      birthdate: this.props.birthdate?.toISOString() ?? null,
      pubertyAge: this.props.pubertyAge ?? null,
      provider: this.props.provider,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
