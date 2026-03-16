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
