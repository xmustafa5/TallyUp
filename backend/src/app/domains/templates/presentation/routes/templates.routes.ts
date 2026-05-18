import type { FastifyInstance } from 'fastify';
import { ROOM_TEMPLATES } from '../../domain/services/template-catalog';
import { listTemplatesSchema } from '../schemas/templates.schemas';

export default async function templatesRoutes(fastify: FastifyInstance) {
  // GET /templates -- public, static catalog
  fastify.get('/templates', { schema: listTemplatesSchema }, async (_request, reply) => {
    return reply.send({ success: true, data: ROOM_TEMPLATES });
  });
}
