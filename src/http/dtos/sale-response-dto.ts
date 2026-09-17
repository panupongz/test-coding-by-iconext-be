import type { SaleStatus, SaleView } from '../../domain/sale.js';

export interface SaleResponseDto {
  readonly sale_id: string;
  readonly product_code: string;
  readonly name: string;
  readonly unit_price: number;
  readonly quantity: number;
  readonly total: number;
  readonly status: SaleStatus;
  readonly created_at: string;
  readonly expires_at: string;
}

export const toSaleResponseDto = (sale: SaleView): SaleResponseDto => ({
  sale_id: sale.saleId,
  product_code: sale.productCode,
  name: sale.name,
  unit_price: sale.unitPrice,
  quantity: sale.quantity,
  total: sale.unitPrice * sale.quantity,
  status: sale.status,
  created_at: sale.createdAt.toISOString(),
  expires_at: sale.expiresAt.toISOString(),
});
