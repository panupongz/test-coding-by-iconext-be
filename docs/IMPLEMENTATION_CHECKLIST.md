# Backend implementation checklist

สถานะเอกสาร: **T-001 DONE; T-002 DONE; T-003 DONE; T-004 DONE; T-005 DONE — Final Gate ผ่านหลัง SRG01 PASS และ audit completion**

## Source of Truth และวิธีอ่าน

- Source หลักคือคำตอบ Grill Me Q001–Q149 จาก task **“ตรวจสอบ Repo GitHub”** และ 10 Main Tasks ที่สรุปจากคำตอบเหล่านั้น
- Source ล่าสุดคือข้อความ **“ก่อนเริ่ม Implement Backend ให้ update requirement decisions ล่าสุด...”** วันที่ 16 กันยายน 2026 ซึ่งกำหนด RC01–RC04 และ RU01–RU08 ด้านล่าง Source ล่าสุดมีลำดับเหนือ requirement เดิมเมื่อขัดกัน
- Architecture Decision **AD01 — Container Architecture** วันที่ 16 กันยายน 2026 กำหนด Docker Compose, backend container และ MySQL 8.x container เป็น Source of Truth ด้าน runtime/development environment โดยไม่เปลี่ยน business requirements
- **ES01–ES11 Engineering Standards** และ **SRG01 Senior Review Gate** วันที่ 16 กันยายน 2026 เป็น Source of Truth ด้าน implementation quality, architecture, database, transaction, idempotency, concurrency, validation, errors, security, logging และ testing
- **AUD01 — AI / Codex Prompt Audit Trail** กำหนดให้ `docs/prompts/` เก็บ promptและผลการทำงานที่ตรวจสอบย้อนหลังได้ และเป็นเงื่อนไขก่อน Taskเปลี่ยนเป็น `DONE`
- `Qnnn` หมายถึงหมายเลขคำถามใน requirement discovery เดิม ไม่ใช่ business rule ที่แยกจากกันทั้งหมด
- สถานะที่ใช้คือ `TODO`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE` เท่านั้น
- `TODO` หมายถึง requirement พร้อมแต่ยังไม่ได้เริ่ม และ **ไม่ใช่คำสั่งให้เริ่มเขียนโค้ด** ต้องรอผู้ใช้อนุมัติ checklist ก่อน
- Test cases ทุกข้อเป็นกรณีที่ต้องผ่านภายหลัง ยังไม่มีผล PASS/FAIL จริง

## Requirement reconciliation

### Requirement เดิมที่ถูกแก้หรือทวนแล้ว

| Ref | Requirement เดิม | ข้อสรุปปัจจุบัน |
| --- | --- | --- |
| D01 | Q010 ระบุ 1 product ต่อ sale; Q011 เคยตอบว่าซื้อหลายชิ้น | Q027–Q028 แก้เป็น `quantity = 1`; ซื้อหลายชิ้นด้วยหลาย Sale |
| D02 | Q039–Q041 สมมติว่า product เปลี่ยนราคา/ถูกลบ | Q042–Q045 ยืนยันว่าไม่มี Product create/update/delete flow; Sale ยังคงเก็บ price snapshot |
| D03 | Q056–Q057 เคยตีความ product code ซ้ำเป็น duplicate | Q058–Q059 ให้ซื้อ code เดิมได้; ป้องกันเฉพาะ request เดิมซ้ำด้วย idempotency |
| D04 | Q060 เคยเลือกให้ server สร้าง key | Q061 แก้เป็น client สร้างและส่ง `Idempotency-Key` header |
| D05 | Q068 เคยให้ Sale สำเร็จแม้บันทึก key ไม่สำเร็จ | Q069 แก้ให้ successful business data และ successful idempotency record เป็น atomic transaction |
| D06 | Q073 เคยให้ key หมดอายุแล้วนำไปสร้าง Sale ใหม่ได้ | Q074–Q075 แก้เป็น key ที่เคยใช้แล้วห้ามใช้กับ request ใหม่และตอบ `409` |
| D07 | Q034 เคยยึดเวลาที่ Payment request เข้ามาเท่านั้น | Q120–Q121 แก้ให้ตรวจ expiry อีกครั้งก่อน commit |
| D08 | Q035–Q037 กล่าวถึงการตรวจ expiry ทุก request | Q122–Q126 ยืนยันว่าไม่มี GET API; action POST เป็นตัวตรวจและ persist expiry transition |
| D09 | Q113 ระบุ Cancel ได้เฉพาะ `PENDING` | Q116 ยืนยันข้อยกเว้นว่า Sale ที่ `CANCELLED` แล้วตอบ `200` ได้โดยไม่เปลี่ยนสถานะซ้ำ |
| D10 | Q049/Q095/Q109–Q110 และ Q127–Q128 ทวนกฎเดิม | เงินทุก field เป็น integer THB และทุก JSON API ใช้ strict validation |
| D11 | Q063 เคยกำหนด idempotency window 5 นาที และ Q075 ให้ expired key ตอบ `409` | กฎล่าสุด RC01–RC03 ระบุ successful same key + same request ให้คืนผลเดิมโดยไม่มีข้อยกเว้นเรื่องเวลา จึง supersede Q063/Q075 สำหรับ replay ของ request เดิม; key เดิมยังห้ามผูก request ใหม่และต้อง `409` |
| D12 | Q066/Q069 เดิมทำให้ failed record กับ business rollback กำกวม | RC04 ให้ rollback business transaction ก่อน แล้ว persist idempotency status `FAILED` ด้วย transaction แยกใน database เดียวกัน |

### Decisions ล่าสุด — RESOLVED ทั้ง 12 รายการ

หมายเลข `RU` ด้านล่างเป็นหมายเลขจากข้อความ decision ล่าสุด ไม่ใช่ `U01–U08` ใน checklist ฉบับก่อน

| ID | สถานะ | Decision ที่เป็น Source of Truth |
| --- | --- | --- |
| RC01 | **RESOLVED — A** | Create Sale: successful same key + same request คืน Sale เดิม/current status ด้วย `200`; ไม่สร้าง Sale ใหม่ แม้ Sale เปลี่ยนเป็น `PAID`/`CANCELLED`; supersede Q146 สำหรับ Create Sale |
| RC02 | **RESOLVED — A** | Payment: successful same key + same request หลัง commit คืน Payment เดิมด้วย `200`; ไม่สร้าง Payment ใหม่; `PAID` ที่เกิดจาก Payment เดิมไม่ใช่ conflict; supersede Q146 สำหรับ Payment |
| RC03 | **RESOLVED — A** | Cancel: successful same key + same request คืนผล `CANCELLED` เดิมด้วย `200`; ไม่เปลี่ยนสถานะซ้ำ; supersede Q146 สำหรับ Cancel |
| RC04 | **RESOLVED — A** | Operation ล้มเหลวให้ rollback business transaction, persist idempotency `FAILED` แยกจาก transaction ที่ rollback, retry key เดิมตอบ `409`, และ key ใช้กับ request ใหม่ไม่ได้ |
| RU01 | **RESOLVED — A** | Relevant POST/action พบ `PENDING` เลย `expires_at` ต้อง persist `PENDING → CANCELLED` แบบ transaction; ห้ามคำนวณสถานะ expired เฉพาะใน response |
| RU02 | **RESOLVED — A** | Payment บน expired `PENDING`: persist `CANCELLED`, ไม่สร้าง Payment, ตอบ `200` body `{ "sale_id": "...", "status": "CANCELLED" }` |
| RU03 | **RESOLVED — A** | Create Sale สำเร็จครั้งแรกตอบ `201 Created`; successful idempotent retry ตอบ `200` พร้อม Sale เดิม |
| RU04 | **RESOLVED — A** | Cancel ใช้ `sale_id` จาก path และ key จาก header โดยไม่มี request body; หากส่ง JSON body ให้ `400` ตาม strict validation |
| RU05 | **RESOLVED — B** | Seed ใช้ mock product data ที่สร้างสำหรับ backend นี้ ไม่พึ่ง ICONEXT product data |
| RU06 | **RESOLVED — A** | Seed exactly 5 products: `P001`–`P005`; Codex เลือก name/description/integer THB price ที่สมเหตุสมผลได้ |
| RU07 | **RESOLVED — B** | `deleted_at` มีเฉพาะ `products`; ห้ามเพิ่มใน `sales` และ `payments` |
| RU08 | **RESOLVED — A** | Product image เก็บ relative path รูปแบบ `/products/P001.jpg`; ห้ามเก็บ absolute URL, localhost URL หรือ production domain |

### AD01 — Container Architecture — APPROVED

```text
Docker Compose
├── backend
│   └── Node.js + TypeScript + Express
└── mysql
    └── MySQL 8.x
```

- Docker Compose มีสอง services คือ `backend` และ `mysql`
- Backend ต้องทำงานใน container ของตนเองด้วย Node.js + TypeScript + Express
- Database ต้องทำงานใน container ของตนเองด้วย MySQL 8.x
- ทั้งสอง services ติดต่อกันผ่าน Docker Compose network
- Backend อ่าน database host, port, username, password และ database name จาก environment variables เท่านั้น ห้าม hard-code
- ภายใน Compose ค่า database host ต้องเป็น service name `mysql` ไม่ใช่ `localhost`
- MySQL service ต้องมี healthcheck และ backend startup ต้อง account for MySQL readiness
- MySQL data ต้อง persist ผ่าน Docker volume
- ต้องมี `.env.example`; ห้าม commit real secrets หรือ `.env`
- ต้องมี `.gitignore` และ `.dockerignore` ที่เหมาะสม
- migration, seed และ test commands ต้อง execute ภายใน backend container ได้
- โปรเจกต์ต้อง build/run ได้ด้วย Docker Compose
- README ต้องระบุ Docker setup, run, migration, seed และ test commands

### ES01–ES11 — Approved Engineering Standards

| ID | Standard | ข้อบังคับ |
| --- | --- | --- |
| ES01 | Backend quality | ใช้ strict TypeScript, explicit types/clear naming; หลีกเลี่ยง `any` เว้นแต่หลีกเลี่ยงไม่ได้และบันทึกเหตุผล; ห้าม duplicated business logic, large controllers, hidden side effects, magic strings/numbers, premature framework และ over-engineering |
| ES02 | Separation of concerns | Dependency flow: Route → Controller → Service/Use Case → Repository/Data Access → MySQL; Controller จัดการ HTTP เท่านั้น; Service จัดการ business/state/idempotency/transaction orchestration; Repository จัดการ query/lock/persistence/DB operations; เพิ่ม abstraction/interface เมื่อมี concrete value เท่านั้น |
| ES03 | Database | MySQL 8.x + migrations; enforce FK, unique, NOT NULL และ column types; เงินใช้ integer THB ห้าม floating point; timestampsเก็บ UTC; default MySQL isolation เว้นแต่ requirement อนุมัติเป็นอย่างอื่น |
| ES04 | Transactions | Transaction แทน business atomicity; critical writesต้อง atomic; Payment lock/validate/create/update/commit; Cancel validation+transition atomic; ใช้ row lock เช่น `SELECT ... FOR UPDATE` เมื่อจำเป็น; transaction ต้องสั้น |
| ES05 | Idempotency | ทำ RC01–RC04 ตามที่อนุมัติ; deterministic request fingerprint/hash; successful retryคืนผลเดิม; different request/failed keyตอบ `409`; ห้าม store full response bodyหากไม่มี approved requirement |
| ES06 | Concurrency | Behavior deterministic; Payment lock Sale; successful Payment ได้สูงสุดหนึ่ง; `payments.sale_id UNIQUE` เป็น final guard; ตรวจ expiryซ้ำก่อน Payment commit; มี integration tests |
| ES07 | Validation | Strict schemaที่ boundary; reject missing/unknown/wrong-type/malformed JSON/invalid enum/business input; ห้าม implicit coercion เช่น string `"100"` เป็น number |
| ES08 | Error handling | ใช้ fixed error-code enum + Thai message; map business errors explicitly; unexpected exceptionไป global fallback; `500` ห้ามเผย stack/SQL/DB error/credential/internal detail |
| ES09 | Configuration/security | Environment-driven configurationและ startup validation; ห้าม commit credentials/secrets/`.env`; ใช้ reasonable Express HTTP security baseline; ห้ามเพิ่ม authentication/authorization; dependenciesน้อยและมีเหตุผล |
| ES10 | Logging | Structured server loggingที่ใช้ debug operational failureได้; ห้าม log secrets/passwords/sensitive env/raw credentials; ไม่เพิ่ม enterprise observability infrastructureที่ไม่จำเป็น |
| ES11 | Testing | ต้องมี unit + integration tests; ครอบคลุม business-critical, failure, transaction, concurrency, idempotency, validation, seed และ sanitized error behavior |

### TECH01–TECH04 — Resolved technical details

ข้อเดิม R01–R04 ไม่ใช่ business-rule decisions และคำสั่งล่าสุดอนุญาตให้เลือกแนวทาง technical ที่เรียบง่ายและสอดคล้องกับ contract เดิม:

| ID | สถานะ | Technical decision |
| --- | --- | --- |
| TECH01 | **RESOLVED** | เก็บ `Sale.status` เป็น string enum `PENDING`, `PAID`, `CANCELLED` พร้อม DB constraint ตาม Q111/Q112 |
| TECH02 | **RESOLVED** | Payment สำเร็จครั้งแรกตอบ `201 Created`; successful idempotent retry ยังคงตอบ `200 OK` |
| TECH03 | **RESOLVED** | Cancel ที่ `sale_id` ผิด UUID formatหรือ UUID ถูกต้องแต่ไม่พบ Sale ตอบ `404 Not Found` + `SALE_NOT_FOUND` ให้สอดคล้อง Q087–Q089 |
| TECH04 | **RESOLVED** | Fixed error-code enum: `VALIDATION_ERROR`, `MALFORMED_JSON`, `INVALID_PRODUCT_CODE`, `PRODUCT_NOT_FOUND`, `SALE_NOT_FOUND`, `SALE_ALREADY_PAID`, `SALE_CANCELLED`, `INSUFFICIENT_CASH_AMOUNT`, `QR_AMOUNT_MISMATCH`, `UNSUPPORTED_PAYMENT_METHOD`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_TOO_LONG`, `IDEMPOTENCY_CONFLICT`, `IDEMPOTENCY_FAILED`, `INTERNAL_SERVER_ERROR` |

### SRG01 — Senior Review Gate

ทุก Main Task และ implementation sub-task ต้องผ่าน flow นี้ก่อน `DONE`:

```text
IMPLEMENT
  ↓
TEST
  ↓
SENIOR REVIEW
  ↓
FIX FINDINGS
  ↓
RE-RUN TESTS
  ↓
UPDATE CHECKLIST
  ↓
UPDATE PROMPT AUDIT
  ↓
DONE
```

Senior Review ตรวจ requirement correctness, architecture, separation of concerns, transaction boundaries, concurrency, idempotency, validation, error handling, DB integrity, strict TypeScript, readability, maintainability, duplication, security baseline, test quality และ unnecessary complexity

Task เปลี่ยนเป็น `DONE` ได้เมื่อ acceptance criteria และ required testsผ่าน, Senior Review ไม่มี unresolved HIGH/MEDIUM finding และ checklistสะท้อน implementationจริง

### Global Definition of Done

Definition of Done นี้ใช้กับทุก Main Task และทุก implementation sub-task ร่วมกับ task-specific acceptance criteria:

- [ ] Implementation ตรง approved requirements/architecture/engineering standards
- [ ] ไม่มี unresolved requirement conflict
- [ ] Strict TypeScript compile/typecheck ผ่าน; ไม่มี undocumented unavoidable `any`
- [ ] Lint ผ่าน
- [ ] Relevant unit tests ผ่าน
- [ ] Relevant integration tests ผ่าน
- [ ] Senior Review เสร็จและไม่มี unresolved HIGH/MEDIUM findings
- [ ] Review findingsถูกแก้และ testsที่เกี่ยวข้องถูก re-run
- [ ] Documentationถูกอัปเดตเมื่อจำเป็น
- [ ] `IMPLEMENTATION_CHECKLIST.md` สะท้อนสถานะจริง
- [ ] Prompt audit trail updated

### Status workflow

- `TODO`: requirementพร้อม ยังไม่เริ่ม
- `IN_PROGRESS`: กำลัง implement/test
- `BLOCKED`: genuine business requirement/conflict ยังไม่มีคำตัดสิน
- `REVIEW`: implementationและ testsที่เกี่ยวข้องผ่าน กำลัง Senior Review
- `DONE`: ผ่าน task-specific acceptance criteria, tests และ SRG01 ครบ

### AUD01 — AI / Codex Prompt Audit Trail — APPROVED

- ใช้ `docs/prompts/00-requirement-and-architecture.md` เก็บ exact requirement/architecture/governance prompts
- ใช้หนึ่ง Markdown file ต่อ T-001–T-010 ตาม mapping ใน `docs/prompts/README.md`
- เก็บ Task ID/title, objective, requirement references, exact Prompt #1, appended follow-up prompts, implementation summary, files, tests/results, Senior Review findings, fixes และ final status
- Historical prompt ต้องเก็บ verbatim ห้าม rewrite/improve/replace; promptเพิ่มเติม appendเป็น `Prompt #2`, `Prompt #3`, ...
- ห้ามบันทึก secret, credential, token, password, real `.env` contents หรือ sensitive configuration
- Task เปลี่ยนเป็น `DONE` ไม่ได้จน audit fileของ Taskนั้นอัปเดตตามหลักฐานจริง

### กฎ idempotency หลัง resolution

1. Client ส่ง non-empty `Idempotency-Key` ยาวไม่เกิน 255 ตัวอักษรให้ทั้ง Create Sale, Payment และ Cancel
2. Successful same key + same request คืนผลของ operation เดิมโดยไม่ execute ซ้ำ:
   - Create Sale retry: `200` + current Sale data/status
   - Payment retry: `200` + existing Payment
   - Cancel retry: `200` + existing `CANCELLED` result
3. Same key + different request ตอบ `409 Conflict` เสมอ และห้ามใช้ key เป็น operation ใหม่
4. Failed operation rollback business transaction แล้วบันทึก key เป็น `FAILED` ด้วย transaction แยก; retry key เดิมตอบ `409`
5. Concurrent same key + same request รอ operation แรกและคืนผลตาม final idempotency status
6. Successful business write กับ successful idempotency record commit แบบ atomic; RC04 เป็นข้อยกเว้นสำหรับการ persist `FAILED` หลัง business rollback
7. Idempotency record อยู่ใน MySQL database เดียวกับ business data แต่ RC04 ใช้ transaction แยกหลัง rollback

### Conflict ที่ยังเหลือ

ไม่พบ conflict ที่ยังไม่ได้ตัดสินหลังใช้ RC01–RC04 และ RU01–RU08 โดย D11–D12 บันทึกผลของ precedence ล่าสุดไว้แล้ว

### Requirement ที่ยังไม่ชัดเจน

ไม่พบ genuine business requirement ที่ยังไม่ชัดเจน R01–R04 เดิมถูกปิดเป็น TECH01–TECH04 ตามข้อกำหนดให้เลือก simple conventional technical solution โดยไม่เปลี่ยน business behavior

## API contract baseline

Contract นี้รวบรวมคำตอบ Q070–Q108, Q113–Q121, Q127–Q135 และ decisions ล่าสุดไว้จุดเดียว โดย decisions ล่าสุดมี precedence ตามตาราง reconciliation

### `POST /api/v1/sales`

- **Path parameters:** ไม่มี
- **Header:** `Idempotency-Key` จำเป็น, ต้องไม่ว่าง, เป็น string ยาวไม่เกิน 255 ตัวอักษร
- **Request body:** `{ "product_code": "P001" }` เท่านั้น; `product_code` ต้องเป็น stringรูปแบบ `P` + 3 digits; missing/unknown/wrong-type/malformed JSON ให้ `400`
- **First success:** `201 Created`; body มีเฉพาะ `sale_id`, `product_code`, `name`, `unit_price`, `quantity`, `total`, `status`, `created_at`, `expires_at`; เวลาเป็น ISO 8601/UTC; ไม่ส่ง idempotency/internal data
- **Successful replay:** `200 OK` พร้อม Sale เดิมใน contract เดียวกันและ current status/data แม้ Sale เป็น `PAID`/`CANCELLED`
- **Errors:** invalid input/key → `400`; Product ไม่พบ → `404`; same key/different request หรือ retry keyสถานะ `FAILED` → `409`; unexpected internal failure → sanitized `500`

### `POST /api/v1/sales/{sale_id}/payment`

- **Path parameter:** `sale_id`; invalid UUIDหรือไม่พบ Sale → `404`
- **Header:** `Idempotency-Key` จำเป็นตามกฎเดียวกันและเป็น operation key แยกจาก Create Sale
- **Request body:** มีเฉพาะ `payment_method` (`CASH` หรือ `QR_PAYMENT`) และ `amount_received` ซึ่งต้องเป็น positive integer number; ห้าม string coercion; missing/unknown/wrong-type/malformed JSON ให้ `400`
- **First success:** `201 Created`; body มีเฉพาะ `payment_id`, `payment_method`, `amount_received`, `paid_at` และ `change` เฉพาะ `CASH`; QR response ไม่มี field `change`
- **Successful replay:** `200 OK` พร้อม Payment เดิมใน contract เดียวกัน
- **Expired `PENDING`:** persist `CANCELLED`, ไม่สร้าง Payment, ตอบ `200 OK` body `{ "sale_id": "...", "status": "CANCELLED" }`
- **Errors:** payment input/method/amountไม่ถูกต้อง → `400`; invalid/missing Sale → `404`; unrelated `PAID`/`CANCELLED`, same key/different request หรือ retry keyสถานะ `FAILED` → `409`; unexpected internal failure → sanitized `500`

### `POST /api/v1/sales/{sale_id}/cancel`

- **Path parameter:** `sale_id`; invalid UUIDหรือไม่พบ Sale → `404` + `SALE_NOT_FOUND`
- **Header:** `Idempotency-Key` จำเป็นตามกฎเดียวกันและเป็น operation key แยก
- **Request body:** ไม่มี; JSON bodyใด ๆ รวม `{}` ให้ `400`
- **Success/replay/already cancelled/expired:** `200 OK` body `{ "sale_id": "...", "status": "CANCELLED" }`; transitionเกิดได้ครั้งเดียว
- **Errors:** invalid keyหรือมี body → `400`; invalid/missing Sale → `404`; `PAID`, same key/different Sale หรือ retry keyสถานะ `FAILED` → `409`; unexpected internal failure → sanitized `500`

### Error contract กลาง

- ทุก `400`/`404`/`409`/`500` ใช้ `{ "error": { "code": "...", "message": "..." } }`
- `code` ต้องอยู่ใน TECH04 fixed enum และ `message` ต้องเป็นภาษาไทย
- Exact Thai wording เป็น technical implementation detail ที่เลือกให้ชัดเจนและสม่ำเสมอได้โดยไม่เปลี่ยน status, code หรือ business behavior

## Traceability ของ Q001–Q149

ตารางนี้ให้ primary owner ของ Q เดิมครบทุกข้อหนึ่งครั้ง Decisions ล่าสุดอ้างใน Task ที่เกี่ยวข้องโดยตรง

| คำถาม | Primary task | คำถาม | Primary task |
| --- | --- | --- | --- |
| Q001–Q003 | T-001 | Q004–Q008 | T-005 |
| Q009–Q016 | T-004 | Q017–Q019 | T-006 |
| Q020–Q022 | T-005 | Q023–Q025 | T-001 |
| Q026–Q029 | T-004 | Q030–Q039 | T-006 |
| Q040 | T-004 | Q041–Q053 | T-003 |
| Q054–Q063 | T-004 | Q064–Q075 | T-008 |
| Q076–Q080 | T-004 | Q081–Q085 | T-002 |
| Q086–Q108 | T-005 | Q109–Q112 | T-002 |
| Q113–Q119 | T-006 | Q120–Q121 | T-005 |
| Q122–Q126 | T-001 | Q127–Q135 | T-007 |
| Q136 | T-001 | Q137–Q139 | T-008 |
| Q140–Q141 | T-002 | Q142–Q143 | T-003 |
| Q144–Q147 | T-008 | Q148 | T-002 |
| Q149 | T-001 | — | — |

## Task dependencies และลำดับ execution

หมายเลข T-001–T-010 เป็นรหัส scope ไม่ได้บังคับให้ implement ตามเลขแบบเส้นตรงทั้งหมด ลำดับที่พร้อมใช้งานโดยไม่อ้าง dependency ที่ยังไม่มีคือ:

1. **T-001** — ไม่มี implementation dependency
2. **T-002** — depends on T-001 สำหรับ project/runtime foundation
3. **T-007 foundation** — depends on T-001; สร้าง shared validation/error contract ก่อน endpoint workflows
4. **T-008 foundation** — depends on T-001, T-002 และ shared error primitives จาก T-007; สร้าง transaction/idempotency/locking/data-integrity primitives โดยส่วนที่ผูกกับแต่ละ workflow จะเสร็จร่วมกับ T-004–T-006
5. **T-003** — depends on T-001 และ T-002
6. **T-004** — depends on T-001–T-003, T-007 foundation และ T-008 foundation
7. **T-005** — depends on T-001–T-004, T-007 foundation และ T-008 foundation
8. **T-006** — depends on T-001, T-002, Sale foundation จาก T-004, T-007 foundation และ T-008 foundation
9. **T-008 completion** — verify feature-specific transaction, lock, rollback และ concurrency behavior หลัง T-004–T-006
10. **T-009** — test cases ต้องพัฒนาร่วมกับแต่ละ Task; final full-suite/Docker verification depends on T-001–T-008
11. **T-010** — documentation update ทำร่วมกับแต่ละ Task; final clean-checkout verification depends on T-001–T-009

T-004–T-006 ห้ามเริ่มก่อน validation/error และ transaction/idempotency foundations ที่เกี่ยวข้องพร้อม การแบ่ง foundation/completion ของ T-007/T-008 ไม่เปลี่ยน requirement หรือ Definition of Done ของ Main Task

## T-001 Backend TypeScript + Express

**Current Status:** DONE

**Objective:** สร้าง runtime/application foundation ที่รันใน Docker Compose, ใช้ strict TypeScript + Express และแยก HTTP/application/data responsibilities ชัดเจน

**Requirement references:** Q001–Q003, Q023–Q025, Q122–Q126, Q133–Q136, Q149; AD01; ES01–ES02; ES08–ES10; SRG01; AUD01.

**Sub-tasks:**

- [x] ตั้งโครง TypeScript + Express และ route prefix `/api/v1` สำหรับสาม API เท่านั้น: `POST /sales`, `POST /sales/{sale_id}/payment`, `POST /sales/{sale_id}/cancel`
- [x] เปิด strict TypeScript และ lint; ใช้ explicit types/clear naming; หลีกเลี่ยง undocumented `any`, magic strings/numbers และ unnecessary abstractions
- [x] วาง Route → Controller → Service/Use Case → Repository/Data Access → MySQL โดย Controllerมีเฉพาะ HTTP concerns และไม่เพิ่ม login, role, stock, Product CRUD, read API หรือ delete API
- [x] วาง configuration สำหรับ MySQL, server time และ UTC โดยไม่เพิ่ม business setting
- [x] validate required environment variablesตอน startup และ fail fastด้วย sanitized errorเมื่อ configurationขาด
- [x] วาง global fallback, reasonable Express HTTP security baseline และ structured server logging โดยไม่เพิ่ม request/correlation IDหรือ log secrets
- [x] เตรียม backend container สำหรับ Node.js + TypeScript + Express และ Docker Compose service ชื่อ `backend`
- [x] เตรียม Compose service ชื่อ `mysql` ด้วย MySQL 8.x; Compose มีสอง services ตาม AD01
- [x] ให้ services ติดต่อกันผ่าน Compose network และให้ backend ใช้ database host `mysql` ภายใน container
- [x] อ่าน database host, port, username, password และ database name จาก environment variables; ห้าม hard-codeค่า connection
- [x] ให้ backend startup account for MySQL readiness และไม่ assume ว่า container start เท่ากับ database พร้อมรับ connection
- [x] เพิ่ม `.env.example`, `.gitignore` และ `.dockerignore`; exclude `.env`, real secrets, dependencies, build/test artifacts และไฟล์ที่ไม่จำเป็นต่อ image context
- [x] ทำให้โปรเจกต์ build และ run ได้ด้วย Docker Compose

**Acceptance Criteria:** TypeScript compile ได้; route ทั้งสามอยู่ใต้ `/api/v1`; ไม่มี API/actor/business flow นอก source; unexpected exception ใช้ error contract กลาง; Compose มี `backend` และ `mysql`; backend run ใน container และ connect MySQL 8.x ผ่าน host `mysql` ด้วย environment variables; startup รองรับ readiness; repository ไม่มี real secrets

**Required Tests:**

- [x] TC-001.1: route table มี action POST สาม route และไม่มี GET/DELETE/Product management route
- [x] TC-001.2: action APIs ไม่ต้องใช้ authentication/authorization
- [x] TC-001.3: unhandled exception ตอบ `500` ตาม error contract และไม่มี stack/query/internal detail ใน body
- [x] TC-001.4: validate Compose config → มี services `backend` และ `mysql`; MySQL image เป็น 8.x
- [x] TC-001.5: build/start Compose จาก clean environment + `.env.example` values ที่เหมาะกับ test → containers start และ backend ไม่ใช้ `localhost` เป็น DB host
- [x] TC-001.6: start backend ขณะที่ MySQL ยังไม่ healthy → backend readiness/startup behavior ไม่ทำให้ระบบพร้อมใช้งานก่อน database พร้อม และสามารถเชื่อมต่อเมื่อ MySQL healthy
- [x] TC-001.7: scan tracked configuration → ไม่มี real secret/`.env`; database connection fieldsมาจาก environment variables

**Definition of Done:**

- [x] Sub-tasksและ Acceptance Criteria ของ T-001 ผ่าน
- [x] Strict TypeScript/typecheck และ lint ผ่าน
- [x] TC-001.1–TC-001.7 ผ่าน
- [x] SRG01 ไม่มี unresolved HIGH/MEDIUM findings
- [x] Setup/config documentationและ checklistอัปเดตตาม implementationจริง
- [x] Prompt audit trail updated

## T-002 MySQL Schema + Migration

**Current Status:** DONE

**Objective:** สร้าง MySQL 8.x schema/migrations และ containerized database environment ที่บังคับ data integrity ตาม requirements

**Requirement references:** Q026, Q040–Q047, Q049–Q053, Q080–Q085, Q109–Q112, Q139–Q141, Q147–Q148; RC04; RU01; RU07–RU08; AD01; TECH01; ES03–ES04; SRG01; AUD01.

**Sub-tasks:**

- [x] Product fields: `product_code`, `name`, `description`, `image`, `price`, `deleted_at`; code เป็น `P` + 3 digits, price เป็น integer THB, image เป็น relative path
- [x] Sale รองรับ UUID `sale_id`, Product reference, `quantity = 1`, price snapshot, status, `created_at`, `expires_at`; ไม่มี `deleted_at`
- [x] Payment รองรับ UUID `payment_id`, unique Sale reference, method, `amount_received`, conditional `change`, `paid_at`; ไม่มี `deleted_at`
- [x] Idempotency record รองรับ key, request identity, operation type, final statusรวม `FAILED` และ resource reference
- [x] ทุก table มี `PRIMARY KEY`; `sales.sale_id` และ `payments.payment_id` เป็น UUID primary keys ส่วน PK strategy ของ `products`/`idempotency_keys` เลือกแบบ conventional ได้โดยยังต้องบังคับ required unique keysเดิม
- [x] ใช้ FK และ unique indexes สำหรับ Product code, Idempotency key และ Payment Sale ID
- [x] ใช้ migration tool; database เก็บเวลาทั้งหมดเป็น UTC; Sale statusเป็น string enumตาม TECH01
- [x] กำหนด Compose `mysql` service เป็น MySQL 8.x พร้อม healthcheck
- [x] persist MySQL data ด้วย Docker named volume
- [x] ทำให้ migration และ seed commands execute ภายใน `backend` container โดยใช้ environment-based connection ไปยัง host `mysql`
- [x] การ run migration/seed ต้องรอหรือ fail อย่างชัดเจนเมื่อ MySQL ยังไม่ ready และทำงานได้เมื่อ healthcheck ผ่าน

**Acceptance Criteria:** migration จาก DB ว่างสำเร็จ; schema/constraints ตรง source; เงินเป็น integer THB; `deleted_at` อยู่เฉพาะ Product; idempotency รองรับ RC01–RC04; Sale statusใช้ TECH01; MySQL 8.x healthy ใน Compose; data survive container recreation ผ่าน volume; migration/seed run ได้จาก backend container

**Required Tests:**

- TC-002.1: migrate DB ว่าง → ตาราง/field/PK/index/FK ครบ
- TC-002.2: duplicate Product code, idempotency key หรือ Payment Sale ID → unique constraint ปฏิเสธ
- TC-002.3: orphan Sale/Payment reference → FK ปฏิเสธ
- TC-002.4: มี `products.deleted_at`; ไม่มี `sales.deleted_at` และ `payments.deleted_at`
- TC-002.5: Sale status column/constraint บังคับ string enum `PENDING`, `PAID`, `CANCELLED`
- TC-002.6: MySQL healthcheck เปลี่ยนเป็น healthy ก่อน dependent database operations
- TC-002.7: execute migration จาก backend containerบน DB ว่าง → สำเร็จและ schema ครบ
- TC-002.8: execute seed จาก backend container → exact five-row seed; rerun เป็น no-op
- TC-002.9: recreate `mysql` container โดยคง named volume → schema/seed/transaction dataยังอยู่

**Implementation evidence (2026-09-17):**

- TC-002.1–TC-002.7: PASS — migration applied to an empty isolated MySQL 8.4 database from the backend container; live metadata and constraint tests passed; Compose waited for `mysql` health before each dependent run
- TC-002.8: DEFERRED — the backend-container seed runner executes and currently reports `seeds_skipped`; exact five-row data is owned by T-003 and was intentionally not implemented in T-002
- TC-002.9: PARTIAL PASS — post-fix recreation of an isolated `mysql` container with its named volume preserved the `P996` sentinel, batch-1 migration record, corrected Payment enum, and named check; seed and later business-transaction persistence remain dependent on T-003–T-006
- SRG01-T002-001 FIXED — `payments.payment_method` and `chk_payments_change_by_method` now use the approved `CASH | QR_PAYMENT` domain; live MySQL accepted valid `QR_PAYMENT` and rejected an unsupported method
- SRG01-T002-002 FIXED — live DML requires `NODE_ENV=test` plus `DB_TEST_CONTEXT=disposable`; complete ordinary DB variables without the disposable flag skipped all 9 schema tests; each enabled test uses a rollback-only transaction, preserved a pre-existing `P997` sentinel, and left no fixture rows
- SRG01-T002-003 FIXED — invalid QR change now targets a valid unpaid Sale and asserts `ER_CHECK_CONSTRAINT_VIOLATED` plus `chk_payments_change_by_method`; replacing only that named check with `CHECK (1 = 1)` made the test fail while the other 8 schema tests passed
- Quality after SRG01 fixes: `npm run typecheck`, `npm run lint`, `npm run build`, and host `npm test` passed; clean isolated MySQL 8.4 migration and complete container suite passed (30/30 tests); repeated migration preserved the sentinel and the single batch-1 migration record
- Independent SRG01 re-review: PASS — all three previous findings were `VERIFIED FIXED`; new findings were BLOCKER 0, MAJOR 0, MINOR 0, NOTE 0; prompt audit and scope checks passed; recommendation `READY FOR FINAL GATE`
- Acceptance coverage is unchanged by the fixes: C01–C04/U01–U02 remain partial schema foundations, U03–U06 remain deferred to later tasks, and U07–U08 remain supported; no later-task behavior was implemented
- Final Gate re-run: PASS — corrected re-review audit evidence, prompt preservation, previous verification validity, SRG01 closure, acceptance ownership, scope, and repository hygiene all passed; T-002 closed as `DONE`

**Definition of Done:**

- [x] Sub-tasksและ T-002-owned Acceptance Criteria ผ่าน; runtime/seed criteriaของ later tasks ถูก deferตาม ownership
- [x] Migration/schema codeผ่าน strict TypeScript/typecheckและ lintที่เกี่ยวข้อง
- [x] TC-002.1–TC-002.7 และ live integration testsผ่าน; T-002-owned schema/persistence portionsของ TC-002.8–TC-002.9 ผ่าน โดย exact seedและ later business-transaction persistenceอยู่ใน T-003–T-006
- [x] SRG01 ตรวจ schema, constraints, migrations, Docker DBและไม่มี unresolved BLOCKER/MAJOR/MINOR findings
- [x] Database documentationและ checklistอัปเดตตาม implementationจริง
- [x] Prompt audit trail updated through independent re-review and Final Gate closure

## T-003 Product Seed แบบ Idempotent

**Current Status:** DONE

**Objective:** จัดเตรียม Product master dataห้ารายการแบบ deterministic และ idempotent ภายใน backend container

**Requirement references:** Q041–Q053, Q142–Q143; RU05–RU06; RU08; AD01; ES03; ES11; SRG01; AUD01.

**Sub-tasks:**

Seed dataset ที่ได้รับอนุญาตให้ Codex กำหนดค่าที่สมเหตุสมผล:

| product_code | name | description | image | price (THB) |
| --- | --- | --- | --- | ---: |
| P001 | Iced Americano | Espresso with chilled water and ice | `/products/P001.jpg` | 60 |
| P002 | Thai Milk Tea | Thai tea with milk served over ice | `/products/P002.jpg` | 55 |
| P003 | Butter Croissant | Flaky butter croissant | `/products/P003.jpg` | 65 |
| P004 | Ham Cheese Sandwich | Sandwich with ham and cheese | `/products/P004.jpg` | 75 |
| P005 | Drinking Water | Bottled drinking water | `/products/P005.jpg` | 15 |

- [x] สร้าง exactly 5 rows ตามตาราง; ไม่มี Product นอก `P001`–`P005`
- [x] ตรวจ code pattern, integer THB และ relative image path
- [x] seed ครั้งแรกสร้างข้อมูล; รันซ้ำด้วยข้อมูลเดิมไม่เพิ่ม/เปลี่ยน record
- [x] duplicate code หรือ code เดิมแต่ field เปลี่ยนให้ seed fail และไม่แก้ master data
- [x] ไม่สร้าง Product create/update/delete API และไม่เพิ่ม ACTIVE/INACTIVE status
- [x] expose seed command ที่ execute ภายใน `backend` container และเชื่อมต่อ Compose service `mysql`

**Acceptance Criteria:** seed สร้างห้า Product ตามตารางครบ; rerun ข้อมูลเดิมเป็น no-op; changed/duplicate seed fail; ไม่มี Product management API; seed command run ได้ภายใน backend container

**Required Tests:**

- TC-003.1: seed DB ว่าง → exactly 5 rows และทุก field ตรงตาราง
- TC-003.2: seed ซ้ำ → row count/data ไม่เปลี่ยน
- TC-003.3: duplicate code หรือเปลี่ยน field ของ code เดิม → fail และ rollback
- TC-003.4: ทุก price เป็น positive integer THB และ image เป็น `/products/{product_code}.jpg`
- TC-003.5: run seed command ภายใน backend containerสองครั้ง → ครั้งแรกสร้างห้า rows และครั้งที่สองไม่เปลี่ยนข้อมูล

**Implementation evidence:**

- canonical Product seed อยู่ที่ `src/database/seeds/202609170001_seed_products.ts` และใช้ transaction ตรวจ existing rows ก่อน insert
- matching canonical rows เป็น no-op; missing canonical rowsถูกเพิ่ม; canonical code ที่ field ใดเปลี่ยนหรือถูก soft-delete ทำให้ seed fail โดยไม่ overwrite
- live integration tests ครอบคลุม exact dataset, positive integer THB, relative image, rerun idempotency, partial matching data และ conflict rollback
- disposable live MySQL suite ผ่าน 34/34; backend `db:seed` สองรอบคง rows/IDs เดิม และ intentional P003 conflict fail โดยไม่ overwrite หรือเพิ่ม row
- Senior Review SRG01: PASS; ไม่มี BLOCKER, MAJOR หรือ MINOR findings
- Final Gate ผ่าน; T-003 ปิดเป็น DONE โดยไม่เปลี่ยน T-004+ status/functionality

**Definition of Done:**

- [x] Sub-tasksและ Acceptance Criteria ของ T-003 ผ่าน
- [x] Seed codeผ่าน strict TypeScript/typecheckและ lint
- [x] TC-003.1–TC-003.5 ผ่าน
- [x] SRG01 ไม่มี unresolved HIGH/MEDIUM findings
- [x] Seed dataset/command documentationและ checklistอัปเดต
- [x] Prompt audit trail updated

## T-004 Create Sale

**Current Status:** DONE

**Objective:** Implement Create Sale ให้ validate, snapshotราคา, persistแบบ atomic และรองรับ idempotency/concurrency ตาม approved decisions

**Requirement references:** Q009–Q016, Q026–Q029, Q040, Q054–Q080, Q145–Q146; RC01; RC04; RU03; ES01–ES02; ES04–ES05; ES07–ES10; SRG01; AUD01.

**Sub-tasks:**

- [x] `POST /api/v1/sales` รับ body เฉพาะ `product_code` และ client `Idempotency-Key`
- [x] code ผิด patternตอบ `400`; code ถูก format แต่ไม่มี Productตอบ `404`; strict validation failureตอบ `400`
- [x] อนุญาต code เดิมสำหรับ Sale คนละรายการ/key; Sale มี Product เดียวและ `quantity = 1`; backend snapshotราคา
- [x] สร้าง UUID Sale เป็น `PENDING`; server กำหนดเวลาและ `expires_at = completion time + 5 minutes`; เก็บ UTC/ส่ง ISO 8601
- [x] first successตอบ `201` พร้อม Sale data ที่ Q079 ระบุและไม่ส่ง key/internal data
- [x] successful same key + same requestตอบ `200` พร้อม current Sale data/status แม้เป็น `PAID`/`CANCELLED`
- [x] same key + different requestตอบ `409`; concurrent same key/same request รอผลแรก
- [x] operation fail ให้ rollback business transaction, persist `FAILED` แยก และ retry key เดิมตอบ `409`

**Acceptance Criteria:** first success `201`; successful retry `200`; duplicate/concurrent request ไม่สร้าง Sale เพิ่ม; failed key ถูกจำและใช้ซ้ำไม่ได้

**Required Tests:**

- TC-004.1: valid code + new key → `201`, `PENDING`, quantity 1, correct snapshot, expiry +5 minutes; responseมี exact field setตาม API contractและไม่มี key/internal data
- TC-004.2: invalid code, missing Product, missing/extra/wrong-type/malformed body และ missing/empty/too-long key → status ตาม Q070–Q078 และไม่มี Sale
- TC-004.3: new key + same code → Sale ใหม่; same key + different request → `409`
- TC-004.4: concurrent same key/same request → Sale เดียวและผล operation เดียวกัน
- TC-004.5: retry หลัง Sale เป็น `PAID`/`CANCELLED` → `200` + current Sale data/status
- TC-004.6: operation fail → business rollback + separate `FAILED`; retry key → `409`

**Implementation evidence:**

- Create Sale ใช้ Route → Controller → Service → Repository → MySQL; strict body/header validationและ Thai fixed-code error contractอยู่ที่ HTTP boundary
- Service สร้าง deterministic SHA-256 request fingerprint, serialize keyด้วย MySQL advisory lockแบบรอจนได้ final result และอ่าน current Sale stateสำหรับ successful replay
- Sale + `SUCCEEDED` idempotency commitใน transactionเดียว; failure rollbackก่อน persist `FAILED` ใน transactionแยกขณะยังถือ key lock
- Live testsยืนยัน UUID, price snapshot, quantity `1`, `PENDING`, UTC ISO response, expiry +5 minutes, replayหลัง `PAID`/`CANCELLED`, different-request conflict, success/failure concurrency และ rollback
- Final Gate: typecheck, lint, build, unit/integration/full host suitesผ่าน; clean disposable MySQL 8.4 suiteผ่าน 57/57; SRG01 findingเรื่อง bounded concurrent waitถูกแก้และไม่มี unresolved BLOCKER/MAJOR/MINOR

**Definition of Done:**

- [x] Sub-tasksและ Acceptance Criteria ของ T-004 ผ่าน
- [x] Strict TypeScript/typecheckและ lintผ่าน; Controllerไม่มี complex business logic
- [x] TC-004.1–TC-004.6 และ relevant unit/integration testsผ่าน
- [x] SRG01 ตรวจ transaction/idempotency/validationและไม่มี unresolved HIGH/MEDIUM findings
- [x] API documentationและ checklistอัปเดต
- [x] Prompt audit trail updated

## T-005 Payment + Concurrency + Idempotency

**Current Status:** DONE

**Objective:** Implement Payment ที่ถูกต้องภายใต้ state, amount, expiry, transaction, idempotency และ concurrent requests

**Requirement references:** Q004–Q008, Q020–Q022, Q034–Q035, Q083–Q108, Q120–Q121, Q145–Q146; RC02; RC04; RU01–RU02; TECH02; ES01–ES08; ES10–ES11; SRG01; AUD01.

**Sub-tasks:**

- [x] Payment endpoint รับ client key แยกจาก Create Sale และ body เฉพาะ `payment_method`, `amount_received`
- [x] amount เป็น positive integer number; CASH ต้องไม่น้อยกว่า totalและบันทึก change; QR ต้องเท่ากับ totalและไม่มี change
- [x] invalid UUID หรือ Sale ไม่พบตอบ `404`; unrelated existing `PAID`/`CANCELLED`ตอบ `409`
- [x] lock Sale; insert Payment + `PENDING → PAID` ใน transaction เดียว; concurrent Payment มีผู้ชนะหนึ่ง request
- [x] ตรวจ expiry ก่อน commit; expired `PENDING` persist `CANCELLED`, ไม่สร้าง Payment, ตอบ `200` body `sale_id` + `status`
- [x] success response fields ตาม Q102–Q104; first successตอบ `201` ตาม TECH02
- [x] successful retryตอบ `200` + existing Payment; same key/different requestหรือ failed key retryตอบ `409`

**Acceptance Criteria:** CASH/QR ถูกต้อง; Payment/PAID atomic; expiry persisted; concurrency ได้ Payment สูงสุดหนึ่ง; retry คืน Payment เดิม; initial successตอบ `201` ตาม TECH02

**Required Tests:**

- TC-005.1: CASH exact amount และ CASH overpayment → `201`, Payment เดียว, Sale `PAID`, `change` เป็น `0`/ผลต่างที่ถูกต้อง และ response exact field set
- TC-005.2: QR exact amount → `201`, Payment เดียว, Sale `PAID`, response exact field setและไม่มี field `change`
- TC-005.3: CASH insufficient/non-positive/wrong-type, QR mismatch, unsupported method และ missing/extra/malformed body → `400`, ไม่มี Payment/status change
- TC-005.4: invalid/missing Sale → `404`; unrelated `PAID`/`CANCELLED` → `409`
- TC-005.5: expired ก่อน/ระหว่าง transaction → `200`, persisted `CANCELLED`, ไม่มี Payment, bodyตรง RU02
- TC-005.6: simultaneous Payments → one success, one `409`, Payment row เดียว
- TC-005.7: successful retry → `200`; same key/different requestหรือ failed key retry → `409`
- TC-005.8: inject failureระหว่าง Payment insert/Sale update/success-idempotency write → Paymentและ Sale state rollbackทั้งชุด; persist `FAILED` แยกและ retry key → `409`

**Implementation evidence:**

- Payment ใช้ Route → Controller → Service → Repository → MySQL พร้อม strict path/header/body validation, fixed error codes และ response field setตาม contract
- Service ใช้ advisory lockต่อ Idempotency-Key บน pinned connectionก่อน transaction และ `SELECT ... FOR UPDATE` บน Sale; Payment, Sale state และ successful idempotency result commitหรือ rollbackร่วมกัน
- Expiry ถูกตรวจทั้งตอนรับ requestและหลัง lock Saleก่อน Payment writes; expired `PENDING` persistเป็น `CANCELLED` โดยไม่มี Payment และ replayคืนผลเดิม
- Live testsใช้ deterministic barriersยืนยัน concurrent different-key requests overlapที่ Sale row, concurrent same-key requests serializeที่ advisory lock, และมี Paymentสำเร็จสูงสุดหนึ่งรายการ
- Failure injectionหลัง Payment insert, Sale update และ successful idempotency writeยืนยัน full rollback; `FAILED` ถูก persistใน transactionแยกและ retryตอบ `409`
- Final Gate: typecheck, lint, build, unit/full host suitesผ่าน; disposable MySQL 8.4 suiteผ่าน 85/85; SRG01 ไม่มี unresolved BLOCKER/MAJOR/MINOR findings

**Definition of Done:**

- [x] Sub-tasksและ Acceptance Criteria ของ T-005 ผ่าน
- [x] Strict TypeScript/typecheckและ lintผ่าน; business/locking logicอยู่ใน Service/Repositoryที่เหมาะสม
- [x] TC-005.1–TC-005.8 รวม concurrency/rollback integration testsผ่าน
- [x] SRG01 ตรวจ money/state/expiry/transaction/idempotency/concurrencyและไม่มี unresolved HIGH/MEDIUM findings
- [x] API documentationและ checklistอัปเดต
- [x] Prompt audit trail updated

## T-006 Cancel + Expiration

**Current Status:** TODO

**Objective:** Implement Cancel และ persisted expiration transition แบบ atomic พร้อม idempotent retries

**Requirement references:** Q017–Q019, Q030–Q039, Q113–Q121, Q145–Q146; RC03–RC04; RU01; RU04; TECH03; ES01–ES08; ES10–ES11; SRG01; AUD01.

**Sub-tasks:**

- [ ] Cancel endpoint ใช้ Sale ID จาก path และ client key จาก header; ไม่มี body
- [ ] JSON body ใด ๆ รวม `{}` ให้ `400`; key validation ใช้กฎเดิม
- [ ] `PENDING → CANCELLED` transactionally; `PAID`ตอบ `409`; expired `PENDING` persist `CANCELLED` และตอบ `200`
- [ ] Sale ที่ `CANCELLED` แล้วและใช้ key ใหม่ตอบ `200` ตาม Q116 โดยไม่มี transition ซ้ำ
- [ ] successful same key/same requestตอบ `200` + existing Cancel result; same key/different Saleตอบ `409`
- [ ] failed operation rollback, persist `FAILED` แยก, retry keyตอบ `409`
- [ ] invalid/missing Saleตอบ `404` + `SALE_NOT_FOUND` ตาม TECH03

**Acceptance Criteria:** Cancel ไม่มี body; transition/expiry persisted; repeated Cancel ไม่เปลี่ยน state ซ้ำ; idempotency ตรง RC03–RC04; invalid/missing Saleตอบ `404` + `SALE_NOT_FOUND` ตาม TECH03

**Required Tests:**

- TC-006.1: cancel `PENDING` → `200`, persisted `CANCELLED`, bodyมี exact field set `sale_id` + `status`
- TC-006.2: cancel `PAID` → `409`, state ไม่เปลี่ยน
- TC-006.3: expired `PENDING` → `200`, persisted `CANCELLED`
- TC-006.4: successful retryและ new keyบน already `CANCELLED` → `200`; same key/different Sale → `409`
- TC-006.5: JSON body รวม `{}` → `400`
- TC-006.6: invalid UUIDหรือ missing Sale → `404` + `SALE_NOT_FOUND`
- TC-006.7: operation fail → rollback + separate `FAILED`; retry key → `409`

**Definition of Done:**

- [ ] Sub-tasksและ Acceptance Criteria ของ T-006 ผ่าน
- [ ] Strict TypeScript/typecheckและ lintผ่าน; transition logicไม่ซ้ำกับ Payment
- [ ] TC-006.1–TC-006.7 และ relevant integration testsผ่าน
- [ ] SRG01 ตรวจ state/expiry/transaction/idempotencyและไม่มี unresolved HIGH/MEDIUM findings
- [ ] API documentationและ checklistอัปเดต
- [ ] Prompt audit trail updated

## T-007 Validation + Thai Error Response

**Current Status:** TODO

**Objective:** บังคับ strict validation และ standardized Thai error contract ที่ปลอดภัยและสม่ำเสมอทุก endpoint

**Requirement references:** Q070–Q078, Q087–Q101, Q127–Q136; RC01–RC04; RU02–RU04; TECH02–TECH04; ES01–ES02; ES07–ES10; SRG01; AUD01.

**Sub-tasks:**

- [ ] strict validation ทุก JSON body: missing/extra/wrong-type และ malformed JSONตอบ `400`
- [ ] Cancel ห้ามมี body; same key + different request และ failed key retryตอบ `409`
- [ ] ใช้ status ที่ยืนยันแล้ว รวม Payment initial successและ Cancel invalid/missing Saleตาม TECH02–TECH03
- [ ] ทุก error ใช้ `{ "error": { "code": ..., "message": ... } }`; code เป็น fixed enum; message ภาษาไทย
- [ ] `500` ใช้ข้อความกลาง ไม่เผย internal detail; global fallback จัดการ unexpected exception
- [ ] ไม่เพิ่ม request/correlation ID; ใช้ fixed enumทั้งชุดตาม TECH04

**Acceptance Criteria:** validation/error contract สม่ำเสมอ; Thai messages; fixed enumตรง TECH04; status ทุก pathตรง Source และ TECH02–TECH03

**Required Tests:**

- TC-007.1: extra/missing/wrong-type/malformed body → `400` + error shape กลาง
- TC-007.2: invalid Create code → `400`; missing Product → `404`; invalid/missing Payment Sale → `404`
- TC-007.3: key/state conflicts → `409` + fixed error code
- TC-007.4: Cancel body → `400`; Cancel invalid/missing Sale → `404` + `SALE_NOT_FOUND`
- TC-007.5: unexpected exception → `500` + Thai generic message ไม่มี internal details
- TC-007.6: ทุก error codeอยู่ใน TECH04 fixed enum
- TC-007.7: ทุก client-visible validation/business/internal error ใช้ message ภาษาไทยที่ไม่ว่าง และไม่เผย English internal/stack/SQL/credential detail

**Definition of Done:**

- [ ] Sub-tasksและ Acceptance Criteria ของ T-007 ผ่าน
- [ ] Strict schemas/typesและ lintผ่าน; ไม่มี implicit coercionหรือ undocumented `any`
- [ ] TC-007.1–TC-007.7 และ error integration testsผ่าน
- [ ] SRG01 ตรวจ validation/error/security/loggingและไม่มี unresolved HIGH/MEDIUM findings
- [ ] Error-code/API documentationและ checklistอัปเดต
- [ ] Prompt audit trail updated

## T-008 Transaction + FK + Unique Index

**Current Status:** TODO

**Objective:** บังคับ business atomicity, row locking และ database integrity สำหรับ critical write flows

**Requirement references:** Q057–Q075, Q084–Q086, Q105–Q108, Q117–Q121, Q137–Q139, Q144–Q147; RC01–RC04; RU01; ES03–ES06; ES11; SRG01; AUD01.

**Sub-tasks:**

- [ ] ทุก business write ใช้ transaction และ MySQL default isolation level
- [ ] ใช้ FK และ unique indexes สำหรับ Product code, Idempotency key และ Payment Sale ID
- [ ] successful Sale/Payment/Cancel/expiry และ success idempotency record commit atomically
- [ ] failed operation rollback business transaction แล้วใช้ transaction แยก persist `FAILED`
- [ ] สร้าง deterministic canonical request fingerprint/hash สำหรับเปรียบเทียบ same key + same/different request โดยไม่เก็บ full response body
- [ ] concurrent same key/same request รอ final result; same key/different requestหรือ failed retryตอบ `409`
- [ ] lock Sale ใน Paymentด้วย row-level lock เช่น `SELECT ... FOR UPDATE`; keep transactionสั้น; unique constraintเป็นชั้นป้องกันสุดท้าย

**Acceptance Criteria:** transaction/constraints บังคับทุกกฎ; ไม่มี partial business writes; failed keyถูกบันทึกแยก; concurrency ไม่สร้าง Sale/Payment ซ้ำ

**Required Tests:**

- TC-008.1: error ระหว่าง business transaction → writes ทั้งชุด rollback
- TC-008.2: หลัง rollback → มี idempotency `FAILED` จาก transaction แยก; retry → `409`
- TC-008.3: FK/unique constraints ปฏิเสธ orphan/duplicate
- TC-008.4: concurrent same key/same request สำหรับ Create/Payment/Cancel → แต่ละกรณี execute operationเดียวและผู้รอได้ final result; same key/different request → `409`
- TC-008.5: concurrent Payment คนละ keyบน Sale เดียว → Payment row เดียว

**Definition of Done:**

- [ ] Sub-tasksและ Acceptance Criteria ของ T-008 ผ่าน
- [ ] Transaction/data-access codeผ่าน strict TypeScript/typecheckและ lint
- [ ] TC-008.1–TC-008.5 รวม deterministic concurrency testsผ่าน
- [ ] SRG01 ตรวจ boundaries/locks/constraints/idempotencyและไม่มี unresolved HIGH/MEDIUM findings
- [ ] Transaction design documentationและ checklistอัปเดต
- [ ] Prompt audit trail updated

## T-009 Unit / Integration Tests

**Current Status:** TODO

**Objective:** สร้าง unit/integration test suite ที่พิสูจน์ business behavior, database effects, concurrency และ Docker environment

**Requirement references:** active Q001–Q149 หลัง D01–D12; RC01–RC04/RU01–RU08; AD01; TECH01–TECH04; ES11; SRG01; AUD01.

**Sub-tasks:**

- [ ] unit tests: pattern, money/change, QR equality, expiry, response mapping, request identity และ error mapping
- [ ] integration testsกับ MySQL: migration, exact seed, APIs, constraints, rollback, separate FAILED persistence, concurrency, replay
- [ ] test matrixครอบคลุม TC ของ T-001–T-008 พร้อม expected HTTP/body/DB state
- [ ] เพิ่ม assertions สำหรับ TECH01–TECH04 และรันพร้อม test suite ตอน implementation
- [ ] เพิ่ม environment verification สำหรับ Compose config/build/start, MySQL healthcheck, backend-to-`mysql` networking, readiness และ volume persistence
- [ ] ทำให้ test command execute ภายใน `backend` containerได้

**Acceptance Criteria:** active requirements ทุกข้อมี test trace; superseded behaviorไม่มี assertion; concurrency/rollback/retry deterministic; Docker environment verification ผ่าน; test suite execute ภายใน backend containerและ PASS

**Required Tests:**

- TC-009.1: matrix ครอบคลุม Create/Payment/Cancel/Seed/Schema/Validation
- TC-009.2: success replay, different-request conflict และ FAILED retryครบสาม APIs
- TC-009.3: migration/seed/FK/unique/transaction/concurrency ใช้ MySQL-compatible environment
- TC-009.4: TECH01–TECH04 มี assertionsครบ; full suite PASS
- TC-009.5: validate/build/start Compose → servicesถูกต้อง, MySQL healthy และ backendเชื่อมต่อผ่าน service name `mysql`
- TC-009.6: run migration, seed และ test commands ภายใน backend container → ทุก commandสำเร็จ
- TC-009.7: restart/recreate services โดยคง volume → MySQL data persistenceผ่าน
- TC-009.8: remove/withhold MySQL readinessระหว่าง startup → backendไม่รายงานพร้อมก่อน DB ready และ recover/connectหลัง DB healthy

**Definition of Done:**

- [ ] Sub-tasksและ Acceptance Criteria ของ T-009 ผ่าน
- [ ] Test codeผ่าน strict TypeScript/typecheckและ lint
- [ ] Unit/integration/Docker/concurrency suitesทั้งหมดผ่านและไม่ flaky
- [ ] SRG01 ตรวจ test coverage/assertion quality/isolationและไม่มี unresolved HIGH/MEDIUM findings
- [ ] Test commands/results summaryและ checklistอัปเดต
- [ ] Prompt audit trail updated

## T-010 README + API Documentation

**Current Status:** TODO

**Objective:** จัดทำเอกสารที่ตรง implementationจริงและทำให้ reviewer setup/run/migrate/seed/test/review ระบบได้

**Requirement references:** Q079–Q082, Q101–Q104, Q119, Q122–Q132, Q145–Q149; RC01–RC04/RU01–RU08; AD01; TECH01–TECH04; ES01–ES11; SRG01; AUD01.

**Sub-tasks:**

- [ ] README ระบุ setup, migration, exact five-row seed และวิธี run/test ตาม implementation จริง
- [ ] API docs ระบุสาม POST ใต้ `/api/v1` และยืนยันว่าไม่มี GET/DELETE/auth/Product management API
- [ ] ระบุ lifecycle, persisted expiry, CASH/QR, integer THB, UTC/ISO 8601 และ relative image paths
- [ ] ระบุ successful replay, different-request `409`, separate FAILED persistence และ failed retry `409`
- [ ] ระบุ initial/retry statuses, fixed error enum, Cancel invalid/missing behavior และ schema statusตาม TECH01–TECH04
- [ ] README ระบุ prerequisites และคำสั่ง Docker Compose สำหรับ config/build/start/stop/status/logs โดยไม่ใส่ real secrets
- [ ] README ระบุวิธีสร้าง local `.env` จาก `.env.example` และอธิบายว่า backend ใน Composeใช้ DB host `mysql`
- [ ] README ระบุ migration, seed และ test commandsที่ execute ภายใน `backend` container
- [ ] README ระบุ MySQL healthcheck/readiness และ named volume persistenceที่จำเป็นต่อการใช้งาน

**Acceptance Criteria:** docs ตรง code/tests/Source; ไม่มี business rule/API เพิ่ม; Docker setup/run/migration/seed/test stepsทำซ้ำได้จาก clean checkout; ไม่มี real secretในตัวอย่าง; TECH01–TECH04 ถูกบันทึกครบ

**Required Tests:**

- TC-010.1: ทำตาม README จาก environment ว่าง → migration/seed/run/test สำเร็จ
- TC-010.2: API examples ตรง integration tests ทั้ง status/body/error/DB effect
- TC-010.3: docs ไม่มี GET/DELETE/login/stock/quantity input/Product CRUD
- TC-010.4: idempotency/expiry/FAILED examples ตรง RC01–RC04/RU01–RU04
- TC-010.5: ผู้ทดสอบทำตาม Docker README จาก clean checkoutด้วย local env → Compose build/start, migration, seed และ test commandsทำงานตามลำดับ

**Definition of Done:**

- [ ] Sub-tasksและ Acceptance Criteria ของ T-010 ผ่าน
- [ ] Project strict TypeScript/typecheck, lintและ relevant testsยังผ่านหลัง doc/config changes
- [ ] TC-010.1–TC-010.5 ผ่านโดย reviewerทำตามเอกสารได้
- [ ] SRG01 ตรวจ accuracy/completeness/securityของ docsและไม่มี unresolved HIGH/MEDIUM findings
- [ ] README/API docsและ checklistสะท้อน implementationจริง
- [ ] Prompt audit trail updated

## Gate ก่อนเริ่ม implementation

- [x] อัปเดต RC01–RC04 และ RU01–RU08 เป็น **RESOLVED**
- [x] เพิ่ม AD01 Container Architecture เป็น approved Source of Truth
- [x] เพิ่ม AUD01 และสร้าง `docs/prompts/` audit structure ครบ T-001–T-010
- [x] ตรวจ contradiction หลัง decisions ล่าสุด; ไม่พบ conflict ที่ยังเหลือ
- [x] ปิด R01–R04 เป็น TECH01–TECH04 โดยไม่เปลี่ยน business behavior
- [x] ตรวจ checklist หลัง TECH01–TECH04 และไม่พบ genuine business blocker
- [x] Final Pre-Implementation Gate ตรวจ requirement completeness, traceability, dependencies, database, Docker, API contracts, idempotency, concurrency, tests, engineering quality และ prompt audit แล้ว: **PASS**
- [x] ผู้ใช้ส่งคำสั่งเริ่ม T-001 อย่างชัดเจนก่อนเริ่ม production code
