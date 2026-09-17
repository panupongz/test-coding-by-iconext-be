# API contract

## Scope and conventions

The service exposes exactly three unauthenticated action endpoints, all using
`POST` under `/api/v1`:

| Action | Endpoint | Request body | Initial success | Successful replay |
| --- | --- | --- | ---: | ---: |
| Create Sale | `/api/v1/sales` | JSON | `201 Created` | `200 OK` |
| Pay Sale | `/api/v1/sales/:sale_id/payment` | JSON | `201 Created` | `200 OK` |
| Cancel Sale | `/api/v1/sales/:sale_id/cancel` | none | `200 OK` | `200 OK` |

There are no `GET` or `DELETE` routes and no login, authentication,
authorization, Product management, stock, or multi-item Sale endpoints.
Product creation/update/deletion is out of scope. A Sale always represents one
unit, and clients cannot submit a quantity.

Product prices and received amounts are positive integer THB values, and
calculated change is a non-negative integer THB value; floating-point and
numeric string values are invalid. JSON bodies use strict validation: missing fields,
unknown fields, wrong types, unsupported enum values, and malformed JSON are
rejected without coercion. Timestamps are stored in UTC and returned as ISO
8601 strings with the `Z` suffix. Product images are stored as relative paths
such as `/products/P001.jpg`, never as absolute URLs.

Every endpoint requires a client-generated `Idempotency-Key` header. Its value
must be non-empty and no longer than 255 characters.

## Sale lifecycle and expiration

`sales.status` is a database enum limited to `PENDING`, `PAID`, and
`CANCELLED`.

| Current state | Payment action | Cancel action |
| --- | --- | --- |
| `PENDING`, not expired | Creates one Payment and changes Sale to `PAID` atomically | Changes Sale to `CANCELLED` atomically |
| `PENDING`, expired | Persists `CANCELLED`, creates no Payment, returns `200` | Persists `CANCELLED`, returns `200` |
| `PAID` | `409 SALE_ALREADY_PAID` | `409 SALE_ALREADY_PAID` |
| `CANCELLED` | `409 SALE_CANCELLED` | Returns the existing `CANCELLED` result with `200` |

A new Sale expires five minutes after creation. Expiration is inclusive:
`expires_at <= observed time` is expired. There is no background scheduler and
no read endpoint that computes a virtual status. A relevant action persists a
detected `PENDING` → `CANCELLED` transition. Payment checks expiration after
locking the Sale and again immediately before commit.

## Idempotency

The key is global across the three operations. The server fingerprints the
operation and its logical request fields; it stores that fingerprint and
resource identifiers, not a full HTTP response body.

- Same key and same successful request: no operation is executed again. Create
  Sale returns the original Sale with its current persisted status; Payment
  returns the original Payment; Cancel returns the original cancelled result.
- Same key and a different request or operation: `409 IDEMPOTENCY_CONFLICT`.
- After HTTP boundary validation, a failed business operation rolls back its
  transaction, then persists a terminal `FAILED` idempotency record in a
  separate transaction. Retrying that key returns `409 IDEMPOTENCY_FAILED`,
  even with the same request.
- Concurrent requests with the same key are serialized. A waiter observes the
  first request's committed success or failed state.

Successful business data and the corresponding successful idempotency record
commit in one transaction. Idempotency records do not expire for replay.

## Create Sale

```http
POST /api/v1/sales HTTP/1.1
Content-Type: application/json
Idempotency-Key: sale-20260917-001

{
  "product_code": "P001"
}
```

`product_code` must match `P` followed by exactly three digits and must refer
to an available, non-deleted Product. The request accepts no other fields.

First success — `201 Created`:

```json
{
  "sale_id": "9a45e9d5-a98f-47f-a4d1-963d92ed0c0d",
  "product_code": "P001",
  "name": "Iced Americano",
  "unit_price": 60,
  "quantity": 1,
  "total": 60,
  "status": "PENDING",
  "created_at": "2026-09-17T03:00:00.000Z",
  "expires_at": "2026-09-17T03:05:00.000Z"
}
```

The Sale stores a price snapshot, so later Product data cannot change its
`unit_price` or `total`. Replaying the same key and request returns `200 OK`,
the same `sale_id`, and the Sale's current data/status. A replay can therefore
show `PAID` or `CANCELLED`.

Database effect on first success: one Sale and one `SUCCEEDED` idempotency row
are committed atomically. Replay creates neither another Sale nor another
idempotency row.

## Pay Sale

Path parameter `sale_id` must be a UUID. Both malformed and well-formed but
missing IDs return `404 SALE_NOT_FOUND`.

### Cash

```http
POST /api/v1/sales/9a45e9d5-a98f-47f7-a4d1-963d92ed0c0d/payment HTTP/1.1
Content-Type: application/json
Idempotency-Key: payment-20260917-001

{
  "payment_method": "CASH",
  "amount_received": 100
}
```

`amount_received` must be at least the Sale total. First success —
`201 Created`:

```json
{
  "payment_id": "68b2aa0d-1f12-4d06-981a-d5bdad5d8336",
  "payment_method": "CASH",
  "amount_received": 100,
  "paid_at": "2026-09-17T03:01:00.000Z",
  "change": 40
}
```

### QR payment

```http
POST /api/v1/sales/9a45e9d5-a98f-47f7-a4d1-963d92ed0c0d/payment HTTP/1.1
Content-Type: application/json
Idempotency-Key: payment-20260917-002

{
  "payment_method": "QR_PAYMENT",
  "amount_received": 60
}
```

QR amount must equal the Sale total exactly. Its first-success response is
`201 Created` and deliberately has no `change` field:

```json
{
  "payment_id": "4bb8eb24-ce83-4fe7-915f-c84bb74bb9aa",
  "payment_method": "QR_PAYMENT",
  "amount_received": 60,
  "paid_at": "2026-09-17T03:01:00.000Z"
}
```

A successful same-request replay returns the existing Payment unchanged with
`200 OK`. Payment locks the Sale and commits the Payment, `PENDING` → `PAID`
transition, and successful idempotency state atomically. At most one Payment
can exist for a Sale.

When the locked Sale is expired, the response is `200 OK`:

```json
{
  "sale_id": "9a45e9d5-a98f-47f7-a4d1-963d92ed0c0d",
  "status": "CANCELLED"
}
```

That result persists the Sale cancellation and successful idempotency state
atomically and creates no Payment.

## Cancel Sale

```http
POST /api/v1/sales/9a45e9d5-a98f-47f7-a4d1-963d92ed0c0d/cancel HTTP/1.1
Idempotency-Key: cancel-20260917-001
```

Do not send a request body or `Content-Type: application/json`. Any JSON body,
including `{}` or `null`, returns `400 VALIDATION_ERROR`. A malformed UUID or
a well-formed UUID that does not identify a Sale returns
`404 SALE_NOT_FOUND`.

Success and successful replay — `200 OK`:

```json
{
  "sale_id": "9a45e9d5-a98f-47f7-a4d1-963d92ed0c0d",
  "status": "CANCELLED"
}
```

The first cancellation atomically persists the state change and successful
idempotency row. Cancelling an already-cancelled Sale is also a successful
operation; a paid Sale conflicts.

## Error contract

Every client-visible `400`, `404`, `409`, and `500` response uses the same
shape and a non-empty Thai message:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลคำขอไม่ถูกต้อง"
  }
}
```

The fixed error-code enum is:

| HTTP status | Code | Meaning |
| ---: | --- | --- |
| 400 | `VALIDATION_ERROR` | Strict request validation failed |
| 400 | `MALFORMED_JSON` | Request JSON could not be parsed |
| 400 | `INVALID_PRODUCT_CODE` | Product code format is invalid |
| 404 | `PRODUCT_NOT_FOUND` | Product does not exist or is deleted |
| 404 | `SALE_NOT_FOUND` | Sale UUID is malformed or Sale does not exist |
| 409 | `SALE_ALREADY_PAID` | Action is invalid for a paid Sale |
| 409 | `SALE_CANCELLED` | Payment is invalid for a cancelled Sale |
| 400 | `INSUFFICIENT_CASH_AMOUNT` | Cash received is below the Sale total |
| 400 | `QR_AMOUNT_MISMATCH` | QR amount differs from the Sale total |
| 400 | `UNSUPPORTED_PAYMENT_METHOD` | Method is not `CASH` or `QR_PAYMENT` |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | Header is absent or blank |
| 400 | `IDEMPOTENCY_KEY_TOO_LONG` | Header exceeds 255 characters |
| 409 | `IDEMPOTENCY_CONFLICT` | Key identifies another request/operation |
| 409 | `IDEMPOTENCY_FAILED` | Key belongs to an earlier failed operation |
| 500 | `INTERNAL_SERVER_ERROR` | Sanitized unexpected server failure |

Unexpected failures never expose stack traces, SQL, credentials, environment
values, or internal exception details in the HTTP response.

## Persisted schema contract

- `products.product_code` is unique; `price` is positive integer THB;
  `deleted_at` exists only on Products; image paths must match
  `/products/{product_code}.jpg`.
- `sales.status` is the string enum `PENDING | PAID | CANCELLED`; quantity is
  constrained to `1`; unit price is a creation-time snapshot; timestamps are
  UTC-oriented; Sales have no `deleted_at`.
- `payments.sale_id` is unique and references Sales; payment method is
  `CASH | QR_PAYMENT`; amount and change are integer THB; Payments have no
  `deleted_at`.
- Foreign keys link Sale → Product, Payment → Sale, and idempotency resource
  identifiers to their business rows. Unique constraints guard Product codes,
  idempotency keys, and one Payment per Sale.
