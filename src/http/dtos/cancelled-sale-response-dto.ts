import { SALE_STATUS } from '../../domain/sale.js';

export interface CancelledSaleResponseDto {
  readonly sale_id: string;
  readonly status: typeof SALE_STATUS.cancelled;
}

export const toCancelledSaleResponseDto = (
  saleId: string,
): CancelledSaleResponseDto => ({
  sale_id: saleId,
  status: SALE_STATUS.cancelled,
});
