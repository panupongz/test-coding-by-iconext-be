export const SALE_STATUS = {
  pending: 'PENDING',
  paid: 'PAID',
  cancelled: 'CANCELLED',
} as const;

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS];

export interface SaleView {
  readonly saleId: string;
  readonly productCode: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly status: SaleStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface SaleResponse {
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

export const isSaleExpiredAt = (
  expiresAt: Date,
  observedAt: Date,
): boolean => expiresAt.getTime() <= observedAt.getTime();

export const toSaleResponse = (sale: SaleView): SaleResponse => ({
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
