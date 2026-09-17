import { z } from 'zod';

export const productCodeSchema = z.string().regex(/^P\d{3}$/);
export const createSaleBodySchema = z
  .object({
    product_code: z.string(),
  })
  .strict();

export type CreateSaleRequestDto = z.infer<typeof createSaleBodySchema>;
