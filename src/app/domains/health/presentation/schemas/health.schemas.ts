import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const LivenessData = Type.Object({
  status: Type.Union([Type.Literal('ok'), Type.Literal('degraded'), Type.Literal('error')]),
  timestamp: Type.String({ format: 'date-time' }),
  uptime: Type.Number({ description: 'Server uptime in seconds' }),
});

const ReadinessData = Type.Object({
  status: Type.Union([Type.Literal('ok'), Type.Literal('degraded'), Type.Literal('error')]),
  timestamp: Type.String({ format: 'date-time' }),
  uptime: Type.Number({ description: 'Server uptime in seconds' }),
  checks: Type.Object({
    database: Type.Union([Type.Literal('up'), Type.Literal('down')]),
    redis: Type.Union([Type.Literal('up'), Type.Literal('down')]),
  }),
});

export const healthLivenessSchema = {
  tags: ['System'],
  summary: 'Liveness probe',
  description: `
Check if the server is running and accepting requests.

**Use Cases**
- Kubernetes liveness probe
- Load balancer health check
- Uptime monitoring

**Returns**
- Server status, timestamp, and uptime in seconds
  `,
  response: {
    200: SuccessResponse(LivenessData),
  },
};

export const healthReadinessSchema = {
  tags: ['System'],
  summary: 'Readiness probe',
  description: `
Check if the server and all its dependencies are ready to handle requests.

**Checks**
- PostgreSQL database connectivity
- Redis connectivity

**Returns**
- Overall status (\`ok\` or \`degraded\`)
- Individual dependency status
- Server uptime
  `,
  response: {
    200: SuccessResponse(ReadinessData),
    503: Type.Object({
      success: Type.Literal(false),
      data: ReadinessData,
    }),
  },
};
