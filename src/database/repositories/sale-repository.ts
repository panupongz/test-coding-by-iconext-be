import type { Knex } from 'knex';

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

export interface NewSaleRecord {
  readonly saleId: string;
  readonly productId: number;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly status: SaleStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
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
}
