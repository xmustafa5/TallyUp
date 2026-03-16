import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from '../../helpers/test-server';

describe('Auth Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    // Clean up test users
    try {
      await server.prisma.user.deleteMany({
        where: { email: { startsWith: 'test-auth-' } },
      });
    } catch {
      // Ignore cleanup errors
    }
    await server.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test-auth-register@example.com',
          name: 'Test User',
          password: 'SecurePass123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test-auth-register@example.com');
      expect(body.data.user.name).toBe('Test User');
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
      // Should not expose password hash
      expect(body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      // First registration
      await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test-auth-duplicate@example.com',
          name: 'User 1',
          password: 'SecurePass123',
        },
      });

      // Duplicate
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test-auth-duplicate@example.com',
          name: 'User 2',
          password: 'SecurePass456',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should reject short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test-auth-short@example.com',
          name: 'Test',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // Register first
      await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test-auth-login@example.com',
          name: 'Login User',
          password: 'SecurePass123',
        },
      });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test-auth-login@example.com',
          password: 'SecurePass123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test-auth-login@example.com');
      expect(body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test-auth-login@example.com',
          password: 'WrongPassword',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      // Register and get token
      const regResponse = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test-auth-me@example.com',
          name: 'Me User',
          password: 'SecurePass123',
        },
      });

      const { tokens } = JSON.parse(regResponse.payload).data;

      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.email).toBe('test-auth-me@example.com');
    });

    it('should reject request without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
