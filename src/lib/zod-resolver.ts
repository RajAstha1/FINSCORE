import type { FieldValues, FieldErrors, Resolver } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

/**
 * Custom Zod 4 resolver compatible with react-hook-form v7.
 * The @hookform/resolvers v5 requires react-hook-form v8 (beta), so we
 * provide our own thin adapter.
 */
export function zodResolver<T extends FieldValues>(
  schema: ZodTypeAny,
): Resolver<T> {
  return async (values, _context, options) => {
    try {
      const result = schema.safeParse(values);

      if (result.success) {
        return {
          values: result.data as T,
          errors: {},
        };
      }

      // Convert Zod 4 errors to react-hook-form FieldErrors format
      const fieldErrors: FieldErrors<T> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        // Only set the first error per field
        if (!fieldErrors[path as keyof T]) {
          fieldErrors[path as keyof T] = {
            type: issue.code || 'validation',
            message: issue.message,
          };
        }
      }

      return {
        values: {} as T,
        errors: fieldErrors,
      };
    } catch (error) {
      // If schema parsing itself fails, return empty errors
      console.error('zodResolver error:', error);
      return {
        values: {} as T,
        errors: {},
      };
    }
  };
}
