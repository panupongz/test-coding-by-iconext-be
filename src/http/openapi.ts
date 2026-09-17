// Keep this representation synchronized with the authoritative contract in docs/API.md.
const saleId = '9a45e9d5-a98f-47f7-a4d1-963d92ed0c0d';

const errorResponse = (description: string, examples: Record<string, unknown>) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      examples,
    },
  },
});

const idempotencyKeyParameter = {
  name: 'Idempotency-Key',
  in: 'header',
  required: true,
  description: 'Client-generated global idempotency key. Must be non-empty and at most 255 characters.',
  schema: {
    type: 'string',
    minLength: 1,
    maxLength: 255,
  },
  example: 'sale-20260917-001',
} as const;

const saleIdParameter = {
  name: 'sale_id',
  in: 'path',
  required: true,
  description: 'Sale UUID. A malformed or unknown value returns SALE_NOT_FOUND.',
  schema: {
    type: 'string',
    format: 'uuid',
  },
  example: saleId,
} as const;

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'ICONEXT Sales API',
    version: '1.0.0',
    description:
      'Interactive representation of the existing sales API. The repository file docs/API.md remains the authoritative business API contract.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [{ name: 'Sales' }],
  paths: {
    '/api/v1/sales': {
      post: {
        tags: ['Sales'],
        summary: 'Create a sale',
        description:
          'Creates a one-unit sale that expires after five minutes. A successful replay returns the current persisted sale with 200.',
        operationId: 'createSale',
        parameters: [idempotencyKeyParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSaleRequest' },
              example: { product_code: 'P001' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Sale created.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Sale' },
                example: {
                  sale_id: saleId,
                  product_code: 'P001',
                  name: 'Iced Americano',
                  unit_price: 60,
                  quantity: 1,
                  total: 60,
                  status: 'PENDING',
                  created_at: '2026-09-17T03:00:00.000Z',
                  expires_at: '2026-09-17T03:05:00.000Z',
                },
              },
            },
          },
          '200': {
            description: 'Successful idempotent replay; the current sale status is returned.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Sale' },
              },
            },
          },
          '400': errorResponse('Invalid body, JSON, product code, or idempotency key.', {
            validation: {
              summary: 'Strict request validation failed',
              value: { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลคำขอไม่ถูกต้อง' } },
            },
            invalidProductCode: {
              summary: 'Product code format is invalid',
              value: {
                error: {
                  code: 'INVALID_PRODUCT_CODE',
                  message: 'รหัสสินค้าต้องอยู่ในรูปแบบ P ตามด้วยตัวเลข 3 หลัก',
                },
              },
            },
          }),
          '404': errorResponse('The product does not exist or is deleted.', {
            productNotFound: {
              value: { error: { code: 'PRODUCT_NOT_FOUND', message: 'ไม่พบสินค้า' } },
            },
          }),
          '409': errorResponse('The idempotency key conflicts with, or belongs to, a failed request.', {
            conflict: {
              value: {
                error: {
                  code: 'IDEMPOTENCY_CONFLICT',
                  message: 'Idempotency-Key นี้ขัดแย้งกับคำขอเดิม',
                },
              },
            },
          }),
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/v1/sales/{sale_id}/payment': {
      post: {
        tags: ['Sales'],
        summary: 'Pay for a sale',
        description:
          'Accepts CASH or QR_PAYMENT. An expired pending sale is persisted as CANCELLED and returned with 200 without creating a payment.',
        operationId: 'paySale',
        parameters: [saleIdParameter, { ...idempotencyKeyParameter, example: 'payment-20260917-001' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentRequest' },
              examples: {
                cash: {
                  value: { payment_method: 'CASH', amount_received: 100 },
                },
                qrPayment: {
                  value: { payment_method: 'QR_PAYMENT', amount_received: 60 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment created.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Payment' },
                examples: {
                  cash: {
                    value: {
                      payment_id: '68b2aa0d-1f12-4d06-981a-d5bdad5d8336',
                      payment_method: 'CASH',
                      amount_received: 100,
                      paid_at: '2026-09-17T03:01:00.000Z',
                      change: 40,
                    },
                  },
                  qrPayment: {
                    value: {
                      payment_id: '4bb8eb24-ce83-4fe7-915f-c84bb74bb9aa',
                      payment_method: 'QR_PAYMENT',
                      amount_received: 60,
                      paid_at: '2026-09-17T03:01:00.000Z',
                    },
                  },
                },
              },
            },
          },
          '200': {
            description: 'Successful payment replay, or cancellation of an expired pending sale.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/Payment' },
                    { $ref: '#/components/schemas/CancelledSale' },
                  ],
                },
                examples: {
                  replay: {
                    value: {
                      payment_id: '68b2aa0d-1f12-4d06-981a-d5bdad5d8336',
                      payment_method: 'CASH',
                      amount_received: 100,
                      paid_at: '2026-09-17T03:01:00.000Z',
                      change: 40,
                    },
                  },
                  expired: {
                    value: { sale_id: saleId, status: 'CANCELLED' },
                  },
                },
              },
            },
          },
          '400': errorResponse('Invalid body, JSON, amount, method, or idempotency key.', {
            validation: {
              value: { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลคำขอไม่ถูกต้อง' } },
            },
            insufficientCash: {
              value: { error: { code: 'INSUFFICIENT_CASH_AMOUNT', message: 'จำนวนเงินสดไม่เพียงพอ' } },
            },
            qrMismatch: {
              value: { error: { code: 'QR_AMOUNT_MISMATCH', message: 'ยอดชำระ QR ต้องเท่ากับยอดรวม' } },
            },
          }),
          '404': errorResponse('The sale UUID is malformed or the sale does not exist.', {
            saleNotFound: {
              value: { error: { code: 'SALE_NOT_FOUND', message: 'ไม่พบรายการขาย' } },
            },
          }),
          '409': errorResponse('The sale state or idempotency key conflicts with payment.', {
            alreadyPaid: {
              value: { error: { code: 'SALE_ALREADY_PAID', message: 'รายการขายนี้ชำระเงินแล้ว' } },
            },
            cancelled: {
              value: { error: { code: 'SALE_CANCELLED', message: 'รายการขายนี้ถูกยกเลิกแล้ว' } },
            },
          }),
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/v1/sales/{sale_id}/cancel': {
      post: {
        tags: ['Sales'],
        summary: 'Cancel a sale',
        description:
          'Send no request body and no Content-Type header. Cancelling a pending, expired, or already-cancelled sale returns CANCELLED.',
        operationId: 'cancelSale',
        parameters: [saleIdParameter, { ...idempotencyKeyParameter, example: 'cancel-20260917-001' }],
        responses: {
          '200': {
            description: 'Sale cancelled, or a successful cancellation replay.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CancelledSale' },
                example: { sale_id: saleId, status: 'CANCELLED' },
              },
            },
          },
          '400': errorResponse('A body was sent, or the idempotency key is invalid.', {
            validation: {
              value: { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลคำขอไม่ถูกต้อง' } },
            },
            keyRequired: {
              value: { error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'กรุณาระบุ Idempotency-Key' } },
            },
          }),
          '404': errorResponse('The sale UUID is malformed or the sale does not exist.', {
            saleNotFound: {
              value: { error: { code: 'SALE_NOT_FOUND', message: 'ไม่พบรายการขาย' } },
            },
          }),
          '409': errorResponse('The sale is paid, or the idempotency key conflicts or previously failed.', {
            alreadyPaid: {
              value: { error: { code: 'SALE_ALREADY_PAID', message: 'รายการขายนี้ชำระเงินแล้ว' } },
            },
            conflict: {
              value: {
                error: {
                  code: 'IDEMPOTENCY_CONFLICT',
                  message: 'Idempotency-Key นี้ขัดแย้งกับคำขอเดิม',
                },
              },
            },
          }),
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateSaleRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['product_code'],
        properties: {
          product_code: { type: 'string', pattern: '^P\\d{3}$', example: 'P001' },
        },
      },
      PaymentRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['payment_method', 'amount_received'],
        properties: {
          payment_method: { type: 'string', enum: ['CASH', 'QR_PAYMENT'] },
          amount_received: { type: 'integer', minimum: 1, example: 100 },
        },
      },
      Sale: {
        type: 'object',
        additionalProperties: false,
        required: [
          'sale_id',
          'product_code',
          'name',
          'unit_price',
          'quantity',
          'total',
          'status',
          'created_at',
          'expires_at',
        ],
        properties: {
          sale_id: { type: 'string', format: 'uuid' },
          product_code: { type: 'string', pattern: '^P\\d{3}$' },
          name: { type: 'string' },
          unit_price: { type: 'integer', minimum: 1 },
          quantity: { type: 'integer', const: 1 },
          total: { type: 'integer', minimum: 1 },
          status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] },
          created_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      Payment: {
        oneOf: [
          { $ref: '#/components/schemas/CashPayment' },
          { $ref: '#/components/schemas/QrPayment' },
        ],
      },
      CashPayment: {
        type: 'object',
        additionalProperties: false,
        required: ['payment_id', 'payment_method', 'amount_received', 'paid_at', 'change'],
        properties: {
          payment_id: { type: 'string', format: 'uuid' },
          payment_method: { const: 'CASH' },
          amount_received: { type: 'integer', minimum: 1 },
          paid_at: { type: 'string', format: 'date-time' },
          change: { type: 'integer', minimum: 0 },
        },
      },
      QrPayment: {
        type: 'object',
        additionalProperties: false,
        required: ['payment_id', 'payment_method', 'amount_received', 'paid_at'],
        properties: {
          payment_id: { type: 'string', format: 'uuid' },
          payment_method: { const: 'QR_PAYMENT' },
          amount_received: { type: 'integer', minimum: 1 },
          paid_at: { type: 'string', format: 'date-time' },
        },
      },
      CancelledSale: {
        type: 'object',
        additionalProperties: false,
        required: ['sale_id', 'status'],
        properties: {
          sale_id: { type: 'string', format: 'uuid' },
          status: { const: 'CANCELLED' },
        },
      },
      ErrorResponse: {
        type: 'object',
        additionalProperties: false,
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'MALFORMED_JSON',
                  'INVALID_PRODUCT_CODE',
                  'PRODUCT_NOT_FOUND',
                  'SALE_NOT_FOUND',
                  'SALE_ALREADY_PAID',
                  'SALE_CANCELLED',
                  'INSUFFICIENT_CASH_AMOUNT',
                  'QR_AMOUNT_MISMATCH',
                  'UNSUPPORTED_PAYMENT_METHOD',
                  'IDEMPOTENCY_KEY_REQUIRED',
                  'IDEMPOTENCY_KEY_TOO_LONG',
                  'IDEMPOTENCY_CONFLICT',
                  'IDEMPOTENCY_FAILED',
                  'INTERNAL_SERVER_ERROR',
                ],
              },
              message: { type: 'string', minLength: 1, description: 'Non-empty Thai message.' },
            },
          },
        },
      },
    },
    responses: {
      InternalServerError: errorResponse('Sanitized unexpected server failure.', {
        internalServerError: {
          value: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' } },
        },
      }),
    },
  },
} as const;
