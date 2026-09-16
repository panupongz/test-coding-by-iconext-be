import type { Knex } from 'knex';

import type { PaymentMethod, PaymentView } from '../../domain/payment.js';
import type { SaleStatus, SaleView } from '../../domain/sale.js';

export interface ProductForSale {
  readonly id: number;
  readonly productCode: string;
  readonly name: string;
  readonly price: number;
}

interface ProductRow {
  readonly id: number;
  readonly product_code: string;
  readonly name: string;
  readonly price: number;
}

interface SaleViewRow {
  readonly sale_id: string;
  readonly product_code: string;
  readonly name: string;
  readonly unit_price: number;
  readonly quantity: number;
  readonly status: SaleStatus;
  readonly created_at: Date;
  readonly expires_at: Date;
}

interface LockedSaleRow {
  readonly sale_id: string;
  readonly unit_price: number;
  readonly quantity: number;
  readonly status: SaleStatus;
  readonly expires_at: Date;
}

interface PaymentViewRow {
  readonly payment_id: string;
  readonly payment_method: PaymentMethod;
  readonly amount_received: number;
  readonly change: number | null;
  readonly paid_at: Date;
}

export interface NewSaleRecord {
  readonly saleId: string;
  readonly productId: number;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly status: SaleStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface LockedSale {
  readonly saleId: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly status: SaleStatus;
  readonly expiresAt: Date;
}

export interface NewPaymentRecord {
  readonly paymentId: string;
  readonly saleId: string;
  readonly paymentMethod: PaymentMethod;
  readonly amountReceived: number;
  readonly change: number | null;
  readonly paidAt: Date;
}

export class SaleRepository {
  public async findAvailableProduct(
    transaction: Knex.Transaction,
    productCode: string,
  ): Promise<ProductForSale | undefined> {
    const product = await transaction<ProductRow>('products')
      .select('id', 'product_code', 'name', 'price')
      .where({ product_code: productCode })
      .whereNull('deleted_at')
      .first();

    if (product === undefined) {
      return undefined;
    }

    return {
      id: product.id,
      productCode: product.product_code,
      name: product.name,
      price: product.price,
    };
  }

  public async insert(
    transaction: Knex.Transaction,
    sale: NewSaleRecord,
  ): Promise<void> {
    await transaction('sales').insert({
      sale_id: sale.saleId,
      product_id: sale.productId,
      unit_price: sale.unitPrice,
      quantity: sale.quantity,
      status: sale.status,
      created_at: sale.createdAt,
      expires_at: sale.expiresAt,
    });
  }

  public async findView(
    connection: Knex | Knex.Transaction,
    saleId: string,
  ): Promise<SaleView | undefined> {
    const sale = await connection('sales')
      .innerJoin('products', 'products.id', 'sales.product_id')
      .select(
        'sales.sale_id',
        'products.product_code',
        'products.name',
        'sales.unit_price',
        'sales.quantity',
        'sales.status',
        'sales.created_at',
        'sales.expires_at',
      )
      .where('sales.sale_id', saleId)
      .first<SaleViewRow | undefined>();

    if (sale === undefined) {
      return undefined;
    }

    return {
      saleId: sale.sale_id,
      productCode: sale.product_code,
      name: sale.name,
      unitPrice: sale.unit_price,
      quantity: sale.quantity,
      status: sale.status,
      createdAt: sale.created_at,
      expiresAt: sale.expires_at,
    };
  }

  public async findByIdForUpdate(
    transaction: Knex.Transaction,
    saleId: string,
  ): Promise<LockedSale | undefined> {
    const sale = await transaction<LockedSaleRow>('sales')
      .select('sale_id', 'unit_price', 'quantity', 'status', 'expires_at')
      .where({ sale_id: saleId })
      .forUpdate()
      .first();

    if (sale === undefined) {
      return undefined;
    }

    return {
      saleId: sale.sale_id,
      unitPrice: sale.unit_price,
      quantity: sale.quantity,
      status: sale.status,
      expiresAt: sale.expires_at,
    };
  }

  public async markPaid(
    transaction: Knex.Transaction,
    saleId: string,
  ): Promise<void> {
    const updatedRows = await transaction('sales')
      .where({ sale_id: saleId, status: 'PENDING' })
      .update({ status: 'PAID' });

    if (updatedRows !== 1) {
      throw new Error('Expected one pending sale to be marked paid');
    }
  }

  public async markCancelled(
    transaction: Knex.Transaction,
    saleId: string,
  ): Promise<void> {
    const updatedRows = await transaction('sales')
      .where({ sale_id: saleId, status: 'PENDING' })
      .update({ status: 'CANCELLED' });

    if (updatedRows !== 1) {
      throw new Error('Expected one pending sale to be marked cancelled');
    }
  }

  public async insertPayment(
    transaction: Knex.Transaction,
    payment: NewPaymentRecord,
  ): Promise<void> {
    await transaction('payments').insert({
      payment_id: payment.paymentId,
      sale_id: payment.saleId,
      payment_method: payment.paymentMethod,
      amount_received: payment.amountReceived,
      change: payment.change,
      paid_at: payment.paidAt,
    });
  }

  public async findPaymentView(
    connection: Knex | Knex.Transaction,
    paymentId: string,
  ): Promise<PaymentView | undefined> {
    const payment = await connection<PaymentViewRow>('payments')
      .select('payment_id', 'payment_method', 'amount_received', 'change', 'paid_at')
      .where({ payment_id: paymentId })
      .first();

    if (payment === undefined) {
      return undefined;
    }

    return {
      paymentId: payment.payment_id,
      paymentMethod: payment.payment_method,
      amountReceived: payment.amount_received,
      change: payment.change,
      paidAt: payment.paid_at,
    };
  }
}
