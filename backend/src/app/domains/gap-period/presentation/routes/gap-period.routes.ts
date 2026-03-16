import type { FastifyInstance } from 'fastify';
import { PrismaGapPeriodRepository } from '../../infrastructure/repositories/prisma-gap-period.repository';
import {
  calculateTotalPrayers,
  resolveAgesToDates,
  calculateDaysInRange,
  calculatePrayersForDays,
} from '../../domain/services/prayer-calculator.service';
import { recalculateBalance } from '../../domain/services/balance-recalculation.service';
import {
  listGapPeriodsSchema,
  createGapPeriodSchema,
  updateGapPeriodSchema,
  deleteGapPeriodSchema,
  calculateSchema,
  getBalanceSchema,
} from '../schemas/gap-period.schemas';

export default async function gapPeriodRoutes(fastify: FastifyInstance) {
  const repository = new PrismaGapPeriodRepository(fastify.prisma);

  // All gap period routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /gap-periods
  fastify.get('/', { schema: listGapPeriodsSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const gapPeriods = await repository.findByUserId(userId);

    return reply.send({
      success: true,
      data: gapPeriods.map((gp) => gp.toResponse()),
    });
  });

  // POST /gap-periods
  fastify.post('/', { schema: createGapPeriodSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = request.body as {
      inputMethod: 'DATE_RANGE' | 'AGE_RANGE';
      startDate?: string;
      endDate?: string;
      startAge?: number;
      endAge?: number;
    };

    let startDate: Date;
    let endDate: Date;
    let originalStartAge: number | null = null;
    let originalEndAge: number | null = null;

    if (body.inputMethod === 'DATE_RANGE') {
      if (!body.startDate || !body.endDate) {
        return reply.badRequest('startDate and endDate are required for DATE_RANGE input method');
      }
      startDate = new Date(body.startDate);
      endDate = new Date(body.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.badRequest('Invalid date format');
      }
      if (startDate > endDate) {
        return reply.badRequest('Start date must be before or equal to end date');
      }
      if (endDate > new Date()) {
        return reply.badRequest('End date cannot be in the future');
      }
    } else if (body.inputMethod === 'AGE_RANGE') {
      if (body.startAge === undefined || body.endAge === undefined) {
        return reply.badRequest('startAge and endAge are required for AGE_RANGE input method');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { birthdate: true },
      });

      if (!user?.birthdate) {
        return reply.badRequest('Birthdate must be set in profile to use age-based input');
      }

      if (body.startAge > body.endAge) {
        return reply.badRequest('Start age must be less than or equal to end age');
      }

      const resolved = resolveAgesToDates(user.birthdate, body.startAge, body.endAge);
      startDate = resolved.startDate;
      endDate = resolved.endDate;
      originalStartAge = body.startAge;
      originalEndAge = body.endAge;

      // Cap end date to today if it extends into the future
      const today = new Date();
      if (endDate > today) {
        endDate = today;
      }
    } else {
      return reply.badRequest('Invalid input method');
    }

    const totalDays = calculateDaysInRange(startDate, endDate);
    const totalPrayers = calculatePrayersForDays(totalDays);

    const gapPeriod = await repository.create({
      userId,
      startDate,
      endDate,
      inputMethod: body.inputMethod,
      originalStartAge,
      originalEndAge,
      totalDays,
      totalPrayers,
    });

    await recalculateBalance(fastify.prisma, userId);

    return reply.code(201).send({
      success: true,
      data: gapPeriod.toResponse(),
    });
  });

  // PUT /gap-periods/:id
  fastify.put('/:id', { schema: updateGapPeriodSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };
    const body = request.body as {
      startDate?: string;
      endDate?: string;
    };

    const existing = await repository.findById(id);
    if (!existing) {
      return reply.notFound('Gap period not found');
    }
    if (existing.userId !== userId) {
      return reply.notFound('Gap period not found');
    }

    const updateData: Record<string, unknown> = {};

    const newStartDate = body.startDate ? new Date(body.startDate) : existing.startDate;
    const newEndDate = body.endDate ? new Date(body.endDate) : existing.endDate;

    if (body.startDate) {
      if (isNaN(newStartDate.getTime())) {
        return reply.badRequest('Invalid start date format');
      }
      updateData.startDate = newStartDate;
    }

    if (body.endDate) {
      if (isNaN(newEndDate.getTime())) {
        return reply.badRequest('Invalid end date format');
      }
      updateData.endDate = newEndDate;
    }

    if (newStartDate > newEndDate) {
      return reply.badRequest('Start date must be before or equal to end date');
    }

    if (newEndDate > new Date()) {
      return reply.badRequest('End date cannot be in the future');
    }

    const totalDays = calculateDaysInRange(newStartDate, newEndDate);
    const totalPrayers = calculatePrayersForDays(totalDays);
    updateData.totalDays = totalDays;
    updateData.totalPrayers = totalPrayers;

    const updated = await repository.update(id, updateData);

    await recalculateBalance(fastify.prisma, userId);

    return reply.send({
      success: true,
      data: updated.toResponse(),
    });
  });

  // DELETE /gap-periods/:id
  fastify.delete('/:id', { schema: deleteGapPeriodSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await repository.findById(id);
    if (!existing) {
      return reply.notFound('Gap period not found');
    }
    if (existing.userId !== userId) {
      return reply.notFound('Gap period not found');
    }

    await repository.delete(id);
    await recalculateBalance(fastify.prisma, userId);

    return reply.send({
      success: true,
      message: 'Gap period deleted successfully',
    });
  });

  // GET /gap-periods/calculate
  fastify.get('/calculate', { schema: calculateSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const gapPeriods = await repository.findByUserId(userId);
    const periods = gapPeriods.map((gp) => ({
      startDate: gp.startDate,
      endDate: gp.endDate,
    }));

    const calculation = calculateTotalPrayers(periods);

    // Get balance
    const balance = await fastify.prisma.prayerBalance.findUnique({
      where: { userId },
    });

    return reply.send({
      success: true,
      data: {
        totalDays: calculation.totalDays,
        totalPrayers: calculation.totalPrayers,
        perType: calculation.perType,
        mergedPeriods: calculation.mergedPeriods.map((p) => ({
          startDate: p.startDate.toISOString().split('T')[0],
          endDate: p.endDate.toISOString().split('T')[0],
          days: p.days,
        })),
        balance: balance
          ? {
              fajr: balance.fajr,
              dhuhr: balance.dhuhr,
              asr: balance.asr,
              maghrib: balance.maghrib,
              isha: balance.isha,
              totalRemaining: balance.totalRemaining,
              totalCompleted: balance.totalCompleted,
            }
          : {
              fajr: 0,
              dhuhr: 0,
              asr: 0,
              maghrib: 0,
              isha: 0,
              totalRemaining: 0,
              totalCompleted: 0,
            },
      },
    });
  });

  // GET /gap-periods/balance
  fastify.get('/balance', { schema: getBalanceSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const balance = await fastify.prisma.prayerBalance.findUnique({
      where: { userId },
    });

    return reply.send({
      success: true,
      data: balance
        ? {
            fajr: balance.fajr,
            dhuhr: balance.dhuhr,
            asr: balance.asr,
            maghrib: balance.maghrib,
            isha: balance.isha,
            totalRemaining: balance.totalRemaining,
            totalCompleted: balance.totalCompleted,
          }
        : {
            fajr: 0,
            dhuhr: 0,
            asr: 0,
            maghrib: 0,
            isha: 0,
            totalRemaining: 0,
            totalCompleted: 0,
          },
    });
  });
}
