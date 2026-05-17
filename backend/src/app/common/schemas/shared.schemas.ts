import { Type } from '@sinclair/typebox';
import type { TSchema } from '@sinclair/typebox';

/**
 * Wrap a data schema in a success response envelope.
 * Output: { success: true, data: T }
 */
export function SuccessResponse<T extends TSchema>(dataSchema: T) {
  return Type.Object({
    success: Type.Literal(true),
    data: dataSchema,
  });
}

/**
 * Wrap a data schema in a paginated response envelope.
 * Output: { success: true, data: T[], meta: { total, page, pageSize, totalPages } }
 */
export function PaginatedResponse<T extends TSchema>(itemSchema: T) {
  return Type.Object({
    success: Type.Literal(true),
    data: Type.Array(itemSchema),
    meta: Type.Object({
      total: Type.Number(),
      page: Type.Number(),
      pageSize: Type.Number(),
      totalPages: Type.Number(),
    }),
  });
}

/**
 * Simple message response.
 * Output: { success: true, message: string }
 */
export const MessageResponse = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});

/**
 * Pagination query parameters schema.
 */
export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

/**
 * Public-safe representation of a user. Never exposes email or phone --
 * only the shareable User ID and display fields (PRD 9.4).
 */
export const UserSummary = Type.Object({
  id: Type.String({ format: 'uuid' }),
  publicId: Type.String(),
  displayName: Type.String(),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
});

/**
 * Resolve { page, pageSize } query params into Prisma skip/take plus the
 * normalized values, applying the same defaults as PaginationQuerySchema.
 * Backend enforces pageSize <= 100.
 */
export function resolvePagination(query: { page?: number; pageSize?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Build the `meta` envelope for a paginated response.
 */
export function paginationMeta(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
