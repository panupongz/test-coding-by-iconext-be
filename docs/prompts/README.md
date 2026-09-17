# AI / Codex Prompt Audit Trail

โฟลเดอร์นี้เป็น audit trail สำหรับ external review โดย ICONEXT และเป็นส่วนหนึ่งของ Definition of Done

## Rules

1. เก็บหนึ่ง Markdown file ต่อ Main Task และใช้ `00-requirement-and-architecture.md` สำหรับ requirement, architecture และ governance prompts
2. คัดลอก user prompt ที่ใช้จริงแบบ verbatim ห้าม rewrite, improve หรือแทนที่ prompt ย้อนหลัง
3. Prompt เพิ่มเติมให้ append เป็น `Prompt #2`, `Prompt #3`, ... ตามลำดับเวลา
4. ห้ามบันทึก secrets, credentials, tokens, passwords, real `.env` contents หรือ sensitive configuration
5. บันทึก implementation summary, files, tests, results, review findings, fixes และ final statusตามหลักฐานจริงเท่านั้น
6. ห้าม mark Task เป็น `DONE` จน audit fileของ Task นั้นอัปเดตครบ
7. หาก prompt มี sensitive data ให้หยุดและสร้าง sanitized follow-up promptก่อนใช้งาน ห้ามเก็บค่าลับลง audit trail

## Task files

| Task | Audit file |
| --- | --- |
| Requirements / Architecture | `00-requirement-and-architecture.md` |
| T-001 | `T-001-project-setup.md` |
| T-002 | `T-002-database-schema.md` |
| T-003 | `T-003-product-seed.md` |
| T-004 | `T-004-create-sale.md` |
| T-005 | `T-005-payment.md` |
| T-006 | `T-006-cancel-expiration.md` |
| T-007 | `T-007-validation-errors.md` |
| T-008 | `T-008-db-integrity.md` |
| T-009 | `T-009-testing.md` |
| T-010 | `T-010-documentation.md` |
| T-011 | `T-011-api-dtos.md` |
| T-012 | `T-012-http-validation-schemas.md` |
| T-013 | `T-013-service-responsibilities.md` |
| T-014 | `T-014-repository-dependency-boundary.md` |

## Update sequence

ก่อนเริ่ม Task ให้บันทึก exact Prompt #1 จากนั้น append follow-up promptsตามจริง ระหว่างและหลังงานให้เติม summary/files/tests/review/fixes เมื่อ Task ผ่าน Senior Review แล้วจึงเปลี่ยน Final Task Status เป็น `DONE` และอัปเดต `docs/IMPLEMENTATION_CHECKLIST.md`
