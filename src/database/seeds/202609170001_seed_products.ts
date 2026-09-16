import type { Knex } from 'knex';

export interface ProductSeedDefinition {
  readonly product_code: string;
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly price: number;
}

interface StoredProduct extends ProductSeedDefinition {
  readonly deleted_at: Date | null;
}

export const PRODUCT_SEED_DEFINITIONS: readonly ProductSeedDefinition[] = [
  {
    product_code: 'P001',
    name: 'Iced Americano',
    description: 'Espresso with chilled water and ice',
    image: '/products/P001.jpg',
    price: 60,
  },
  {
    product_code: 'P002',
    name: 'Thai Milk Tea',
    description: 'Thai tea with milk served over ice',
    image: '/products/P002.jpg',
    price: 55,
  },
  {
    product_code: 'P003',
    name: 'Butter Croissant',
    description: 'Flaky butter croissant',
    image: '/products/P003.jpg',
    price: 65,
  },
  {
    product_code: 'P004',
    name: 'Ham Cheese Sandwich',
    description: 'Sandwich with ham and cheese',
    image: '/products/P004.jpg',
    price: 75,
  },
  {
    product_code: 'P005',
    name: 'Drinking Water',
    description: 'Bottled drinking water',
    image: '/products/P005.jpg',
    price: 15,
  },
];

export class ProductSeedConflictError extends Error {
  public constructor(productCodes: readonly string[]) {
    super(
      `Canonical product seed conflicts with existing data for: ${productCodes.join(', ')}`,
    );
    this.name = 'ProductSeedConflictError';
  }
}

const matchesCanonicalDefinition = (
  storedProduct: StoredProduct,
  canonicalProduct: ProductSeedDefinition,
): boolean =>
  storedProduct.product_code === canonicalProduct.product_code &&
  storedProduct.name === canonicalProduct.name &&
  storedProduct.description === canonicalProduct.description &&
  storedProduct.image === canonicalProduct.image &&
  storedProduct.price === canonicalProduct.price &&
  storedProduct.deleted_at === null;

export const seed = async (database: Knex): Promise<void> => {
  await database.transaction(async (transaction) => {
    const productCodes = PRODUCT_SEED_DEFINITIONS.map(
      ({ product_code }) => product_code,
    );
    const storedProducts = await transaction<StoredProduct>('products')
      .select(
        'product_code',
        'name',
        'description',
        'image',
        'price',
        'deleted_at',
      )
      .whereIn('product_code', productCodes)
      .forUpdate();
    const storedProductsByCode = new Map(
      storedProducts.map((product) => [product.product_code, product]),
    );
    const conflictingProductCodes = PRODUCT_SEED_DEFINITIONS.filter(
      (canonicalProduct) => {
        const storedProduct = storedProductsByCode.get(
          canonicalProduct.product_code,
        );

        return (
          storedProduct !== undefined &&
          !matchesCanonicalDefinition(storedProduct, canonicalProduct)
        );
      },
    ).map(({ product_code }) => product_code);

    if (conflictingProductCodes.length > 0) {
      throw new ProductSeedConflictError(conflictingProductCodes);
    }

    const missingProducts = PRODUCT_SEED_DEFINITIONS.filter(
      ({ product_code }) => !storedProductsByCode.has(product_code),
    );

    if (missingProducts.length > 0) {
      await transaction('products').insert(missingProducts);
    }
  });
};
