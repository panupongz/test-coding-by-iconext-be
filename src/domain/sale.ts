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

export const isSaleExpiredAt = (
  expiresAt: Date,
  observedAt: Date,
): boolean => expiresAt.getTime() <= observedAt.getTime();
