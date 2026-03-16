import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from '../../helpers/test-server';

const TEST_EMAIL = 'test-gap-period-routes@example.com';
const TEST_EMAIL_2 = 'test-gap-period-routes-2@example.com';

async function registerAndGetToken(
  server: FastifyInstance,
  email: string,
  name = 'Test User',
): Promise<string> {
  const response = await server.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, name, password: 'SecurePass123' },
  });
  const body = JSON.parse(response.payload);
  return body.data.tokens.accessToken;
}

describe('Gap Period Routes', () => {
  let server: FastifyInstance;
  let accessToken: string;
  let accessToken2: string;

  beforeAll(async () => {
    server = await buildTestServer();
    accessToken = await registerAndGetToken(server, TEST_EMAIL);
    accessToken2 = await registerAndGetToken(server, TEST_EMAIL_2, 'Test User 2');
  });

  afterAll(async () => {
    try {
      // Clean up test data in dependency order
      const testUsers = await server.prisma.user.findMany({
        where: { email: { startsWith: 'test-gap-period-routes' } },
        select: { id: true },
      });
      const userIds = testUsers.map((u) => u.id);

      if (userIds.length > 0) {
        await server.prisma.makeupLog.deleteMany({ where: { userId: { in: userIds } } });
        await server.prisma.prayerBalance.deleteMany({ where: { userId: { in: userIds } } });
        await server.prisma.gapPeriod.deleteMany({ where: { userId: { in: userIds } } });
        await server.prisma.user.deleteMany({
          where: { email: { startsWith: 'test-gap-period-routes' } },
        });
      }
    } catch {
      // Ignore cleanup errors
    }
    await server.close();
  });

  // ── Authentication ────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should return 401 for GET /gap-periods without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for POST /gap-periods without token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-01-01',
          endDate: '2020-12-31',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for GET /gap-periods/calculate without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/calculate',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for GET /gap-periods/balance without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/balance',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ── GET /gap-periods ──────────────────────────────────────────────

  describe('GET /gap-periods', () => {
    it('should return empty array when no gap periods exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should return gap periods after creation', async () => {
      // Create a gap period first
      await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-01-01',
          endDate: '2020-01-10',
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const period = body.data.find(
        (p: { startDate: string }) => p.startDate === '2020-01-01',
      );
      expect(period).toBeDefined();
      expect(period.endDate).toBe('2020-01-10');
      expect(period.inputMethod).toBe('DATE_RANGE');
      expect(period.totalDays).toBe(10);
      expect(period.totalPrayers).toBe(50);
    });
  });

  // ── POST /gap-periods (DATE_RANGE) ────────────────────────────────

  describe('POST /gap-periods (DATE_RANGE)', () => {
    it('should create a gap period with DATE_RANGE', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2019-06-01',
          endDate: '2019-06-30',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.startDate).toBe('2019-06-01');
      expect(body.data.endDate).toBe('2019-06-30');
      expect(body.data.inputMethod).toBe('DATE_RANGE');
      expect(body.data.totalDays).toBe(30);
      expect(body.data.totalPrayers).toBe(150);
      expect(body.data.originalStartAge).toBeNull();
      expect(body.data.originalEndAge).toBeNull();
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    it('should reject DATE_RANGE without startDate', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          endDate: '2020-12-31',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject DATE_RANGE without endDate', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-01-01',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject DATE_RANGE with end date before start date', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-12-31',
          endDate: '2020-01-01',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject DATE_RANGE with future end date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-01-01',
          endDate: futureDateStr,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ── POST /gap-periods (AGE_RANGE) ────────────────────────────────

  describe('POST /gap-periods (AGE_RANGE)', () => {
    it('should reject AGE_RANGE when user has no birthdate set', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'AGE_RANGE',
          startAge: 10,
          endAge: 15,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should create a gap period with AGE_RANGE when birthdate is set', async () => {
      // Set birthdate on user's profile
      await server.inject({
        method: 'PUT',
        url: '/profile',
        headers: { authorization: `Bearer ${accessToken2}` },
        payload: { birthdate: '1990-01-01' },
      });

      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken2}` },
        payload: {
          inputMethod: 'AGE_RANGE',
          startAge: 10,
          endAge: 12,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.inputMethod).toBe('AGE_RANGE');
      expect(body.data.originalStartAge).toBe(10);
      expect(body.data.originalEndAge).toBe(12);
      expect(body.data.totalDays).toBeGreaterThan(0);
      expect(body.data.totalPrayers).toBeGreaterThan(0);
    });
  });

  // ── PUT /gap-periods/:id ──────────────────────────────────────────

  describe('PUT /gap-periods/:id', () => {
    let periodId: string;

    beforeAll(async () => {
      // Create a period to update
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2018-03-01',
          endDate: '2018-03-31',
        },
      });
      const body = JSON.parse(response.payload);
      periodId = body.data.id;
    });

    it('should update a gap period', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/gap-periods/${periodId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          startDate: '2018-03-01',
          endDate: '2018-04-30',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.startDate).toBe('2018-03-01');
      expect(body.data.endDate).toBe('2018-04-30');
      expect(body.data.totalDays).toBe(61);
      expect(body.data.totalPrayers).toBe(305);
    });

    it('should return 404 for non-existent gap period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await server.inject({
        method: 'PUT',
        url: `/gap-periods/${fakeId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          startDate: '2020-01-01',
          endDate: '2020-01-31',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 when updating another user\'s gap period', async () => {
      // accessToken2 tries to update accessToken's period
      const response = await server.inject({
        method: 'PUT',
        url: `/gap-periods/${periodId}`,
        headers: { authorization: `Bearer ${accessToken2}` },
        payload: {
          startDate: '2018-03-01',
          endDate: '2018-05-31',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ── DELETE /gap-periods/:id ───────────────────────────────────────

  describe('DELETE /gap-periods/:id', () => {
    let periodId: string;

    beforeAll(async () => {
      // Create a period to delete
      const response = await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2017-01-01',
          endDate: '2017-01-31',
        },
      });
      const body = JSON.parse(response.payload);
      periodId = body.data.id;
    });

    it('should delete a gap period', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: `/gap-periods/${periodId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Gap period deleted successfully');

      // Verify it's gone
      const listResponse = await server.inject({
        method: 'GET',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const listBody = JSON.parse(listResponse.payload);
      const found = listBody.data.find((p: { id: string }) => p.id === periodId);
      expect(found).toBeUndefined();
    });

    it('should return 404 for non-existent gap period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await server.inject({
        method: 'DELETE',
        url: `/gap-periods/${fakeId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ── GET /gap-periods/calculate ────────────────────────────────────

  describe('GET /gap-periods/calculate', () => {
    let calcToken: string;

    beforeAll(async () => {
      // Use a fresh user for isolated calculation tests
      calcToken = await registerAndGetToken(
        server,
        'test-gap-period-routes-calc@example.com',
        'Calc User',
      );
    });

    it('should return zero totals when no gap periods exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/calculate',
        headers: { authorization: `Bearer ${calcToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.totalDays).toBe(0);
      expect(body.data.totalPrayers).toBe(0);
      expect(body.data.mergedPeriods).toEqual([]);
    });

    it('should calculate totals for a single period', async () => {
      await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${calcToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-01-01',
          endDate: '2020-01-10',
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/calculate',
        headers: { authorization: `Bearer ${calcToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.totalDays).toBe(10);
      expect(body.data.totalPrayers).toBe(50);
      expect(body.data.perType.fajr).toBe(10);
      expect(body.data.perType.dhuhr).toBe(10);
      expect(body.data.perType.asr).toBe(10);
      expect(body.data.perType.maghrib).toBe(10);
      expect(body.data.perType.isha).toBe(10);
      expect(body.data.mergedPeriods).toHaveLength(1);
    });

    it('should merge overlapping periods in calculation', async () => {
      // Create an overlapping period (2020-01-05 to 2020-01-15)
      // Already have 2020-01-01 to 2020-01-10 from previous test
      await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${calcToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2020-01-05',
          endDate: '2020-01-15',
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/calculate',
        headers: { authorization: `Bearer ${calcToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // Merged: 2020-01-01 to 2020-01-15 = 15 days
      expect(body.data.totalDays).toBe(15);
      expect(body.data.totalPrayers).toBe(75);
      expect(body.data.mergedPeriods).toHaveLength(1);
      expect(body.data.mergedPeriods[0].startDate).toBe('2020-01-01');
      expect(body.data.mergedPeriods[0].endDate).toBe('2020-01-15');
      expect(body.data.mergedPeriods[0].days).toBe(15);
    });
  });

  // ── GET /gap-periods/balance ──────────────────────────────────────

  describe('GET /gap-periods/balance', () => {
    let balanceToken: string;

    beforeAll(async () => {
      // Use a fresh user for isolated balance tests
      balanceToken = await registerAndGetToken(
        server,
        'test-gap-period-routes-balance@example.com',
        'Balance User',
      );
    });

    it('should return zero balance when no gap periods exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/balance',
        headers: { authorization: `Bearer ${balanceToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.fajr).toBe(0);
      expect(body.data.dhuhr).toBe(0);
      expect(body.data.asr).toBe(0);
      expect(body.data.maghrib).toBe(0);
      expect(body.data.isha).toBe(0);
      expect(body.data.totalRemaining).toBe(0);
      expect(body.data.totalCompleted).toBe(0);
    });

    it('should reflect balance after creating a gap period', async () => {
      await server.inject({
        method: 'POST',
        url: '/gap-periods',
        headers: { authorization: `Bearer ${balanceToken}` },
        payload: {
          inputMethod: 'DATE_RANGE',
          startDate: '2021-01-01',
          endDate: '2021-01-10',
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/gap-periods/balance',
        headers: { authorization: `Bearer ${balanceToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      // 10 days = 10 per prayer type
      expect(body.data.fajr).toBe(10);
      expect(body.data.dhuhr).toBe(10);
      expect(body.data.asr).toBe(10);
      expect(body.data.maghrib).toBe(10);
      expect(body.data.isha).toBe(10);
      expect(body.data.totalRemaining).toBe(50);
      expect(body.data.totalCompleted).toBe(0);
    });
  });
});
