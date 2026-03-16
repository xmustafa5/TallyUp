export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  checks?: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export interface HealthDependencies {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
}

/**
 * Liveness check -- returns basic status without dependency checks.
 */
export function getLivenessStatus(): HealthCheckResult {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

/**
 * Readiness check -- verifies all dependencies are reachable.
 */
export async function getReadinessStatus(deps: HealthDependencies): Promise<HealthCheckResult> {
  const [dbOk, redisOk] = await Promise.all([
    deps.checkDatabase().catch(() => false),
    deps.checkRedis().catch(() => false),
  ]);

  const allHealthy = dbOk && redisOk;

  return {
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
    },
  };
}
