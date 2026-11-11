-- W1-G1 synthetic populated fixture (schema 0007).
-- All values are invented. No real company, customer or credential data.
PRAGMA foreign_keys = ON;

INSERT INTO user (id, name, email, email_verified, created_at, updated_at, must_change_password, is_active, disabled_at) VALUES
  ('u-admin',   'Admin Synthetic',   'admin@w1.invalid',   1, 1760000000000, 1760000000000, 0, 1, NULL),
  ('u-ops',     'Ops Synthetic',     'ops@w1.invalid',     1, 1760000001000, 1760000001000, 0, 1, NULL),
  ('u-officer', 'Officer Synthetic', 'officer@w1.invalid', 1, 1760000002000, 1760000002000, 1, 1, NULL),
  ('u-gone',    'Disabled Synthetic','gone@w1.invalid',    1, 1760000003000, 1760000003000, 0, 0, 1760000009000);

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES
  ('acc-admin', 'u-admin', 'credential', 'u-admin', 'synthetic-not-a-real-hash', 1760000000000, 1760000000000);

INSERT INTO user_roles (user_id, role_id) VALUES
  ('u-admin', 'role-admin'),
  ('u-ops', 'role-ops'),
  ('u-officer', 'role-officer'),
  ('u-gone', 'role-admin');

INSERT INTO user_permission_overrides (user_id, permission_key, effect) VALUES
  ('u-officer', 'documents.review', 'GRANT'),
  ('u-officer', 'export_cases.close', 'DENY');

INSERT INTO user_preferences (user_id, language, timezone, updated_at) VALUES
  ('u-admin', 'en', 'Africa/Cairo', '2026-10-01T00:00:00.000Z'),
  ('u-officer', 'ar', 'Africa/Cairo', '2026-10-01T00:00:00.000Z');

INSERT INTO customers (id, legal_name, trade_name, country_code, notes, version, created_at, updated_at, created_by, tax_id) VALUES
  ('c-alex',    'Alexandria Textiles LLC', 'AlexTex', 'EG', 'synthetic fixture', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'u-admin', 'EG-TAX-0001'),
  ('c-rot',     'Rotterdam Import BV',     'RotImp',  'NL', NULL,                2, '2026-01-02T00:00:00.000Z', '2026-02-01T00:00:00.000Z', 'u-ops',   'NL-TAX-0002'),
  ('c-legacy',  'Legacy Partner Co',       NULL,      'DE', 'legacy variant',    1, '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z', 'u-admin', NULL);

INSERT INTO customer_contacts (id, customer_id, full_name, title, email, phone, is_primary) VALUES
  ('cc-1', 'c-alex', 'Mona Synthetic', 'Buyer', 'mona@w1.invalid', '+200000000001', 1),
  ('cc-2', 'c-rot',  'Hans Synthetic', 'Buyer', 'hans@w1.invalid', '+310000000002', 1);

INSERT INTO customer_addresses (id, customer_id, kind, line1, city, country_code, is_primary) VALUES
  ('ca-1', 'c-alex', 'BILLING', '1 Synthetic Street', 'Alexandria', 'EG', 1),
  ('ca-2', 'c-rot',  'BILLING', '2 Synthetic Lane',   'Rotterdam',  'NL', 1);

INSERT INTO customer_bank_accounts (id, customer_id, bank_name, account_name, account_number_last4, iban_last4, swift, created_at) VALUES
  ('cb-1', 'c-alex', 'Synthetic Bank', 'Alexandria Textiles LLC', '1222', '0001', 'SYNCEGXX', '2026-01-01T00:00:00.000Z');

INSERT INTO export_cases (id, case_reference, customer_id, status, document_route, bank_path_status, direct_path_status, assigned_to, destination_country, closed_at, version, created_at, updated_at, created_by) VALUES
  ('k-active',  'EF-2026-0001', 'c-alex',   'ACTIVE',    'BANK_ROUTE',   'BANK_REVIEW',        NULL,        'u-officer', 'NL', NULL, 3, '2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z', 'u-admin'),
  ('k-hold',    'EF-2026-0002', 'c-rot',    'ON_HOLD',   'DIRECT_ROUTE', 'NOT_REQUIRED',       'PREPARING', 'u-officer', 'DE', NULL, 2, '2026-02-02T00:00:00.000Z', '2026-03-02T00:00:00.000Z', 'u-ops'),
  ('k-done',    'EF-2026-0003', 'c-legacy', 'COMPLETED', 'DIRECT_ROUTE', 'NOT_REQUIRED',       'DOCUMENTS_DELIVERED', 'u-ops', 'EG', '2026-09-01T00:00:00.000Z', 5, '2026-02-03T00:00:00.000Z', '2026-09-01T00:00:00.000Z', 'u-admin');

INSERT INTO export_case_customer_snapshots (case_id, legal_name, trade_name, contact_name, contact_phone, contact_email, address_line1, city, country_code, captured_at) VALUES
  ('k-active', 'Alexandria Textiles LLC', 'AlexTex', 'Mona Synthetic', '+200000000001', 'mona@w1.invalid', '1 Synthetic Street', 'Alexandria', 'EG', '2026-02-01T00:00:00.000Z'),
  ('k-done',   'Legacy Partner Co', NULL, NULL, NULL, NULL, NULL, NULL, 'DE', '2026-02-03T00:00:00.000Z');

INSERT INTO export_invoices (id, case_id, invoice_number, invoice_date, customer_id, port_of_loading, port_of_discharge, destination_country, payment_term_code, incoterm, incoterms_edition, named_place, currency, goods_value_minor, invoiced_freight_minor, actual_freight_expense_minor, invoice_total_minor, gross_weight_grams, net_weight_grams, units, version, created_at, updated_at) VALUES
  ('i-1', 'k-active', 'INV-2026-0001', '2026-02-10', 'c-alex', 'EGALY', 'NLRTM', 'NL', 'TT', 'CFR', 'Incoterms 2020', 'Rotterdam', 'USD', 1250000, 250000, 260000, 1500000, 12500000, 11200000, 400, 3, '2026-02-10T00:00:00.000Z', '2026-03-10T00:00:00.000Z'),
  ('i-2', 'k-hold',   'INV-2026-0002', '2026-02-11', 'c-rot',  'EGDAM', 'DEHAM', 'DE', 'LC', 'FOB', 'Incoterms 2020', 'Hamburg',   'USD',  800000,      0,  90000,  800000,  9000000,  8100000, 220, 1, '2026-02-11T00:00:00.000Z', '2026-03-11T00:00:00.000Z'),
  ('i-3', 'k-done',   'INV-2025-0912', '2025-09-12', 'c-legacy','EGALY', 'DEHAM', 'DE', 'DP', 'FOB', 'Incoterms 2020', 'Hamburg',   'USD',  430000,      0,  55000,  430000,  5000000,  4700000, 100, 7, '2025-09-12T00:00:00.000Z', '2026-01-05T00:00:00.000Z');

INSERT INTO document_type_definitions (id, key, name_en, name_ar, active) VALUES
  ('dt-w1-bill',   'w1_bill_of_lading', 'Bill of Lading', 'بوليصة شحن', 1),
  ('dt-w1-origin', 'w1_certificate_origin', 'Certificate of Origin', 'شهادة منشأ', 1),
  ('dt-w1-pack',   'w1_packing_list', 'Packing List', 'قائمة تعبئة', 1);

INSERT INTO operation_document_requirements (id, case_id, document_type_id, required, due_date, status, owner_user_id, waived_reason, created_at, updated_at) VALUES
  ('dr-1', 'k-active', 'dt-w1-bill',   1, '2026-03-01', 'APPROVED',          'u-officer', NULL, '2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'),
  ('dr-2', 'k-active', 'dt-w1-origin', 1, '2026-03-05', 'NEEDS_CORRECTION',  'u-officer', NULL, '2026-02-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z'),
  ('dr-3', 'k-active', 'dt-w1-pack',   1, NULL,         'UPLOADED',          'u-officer', NULL, '2026-02-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z'),
  ('dr-4', 'k-active', 'dt-w1-origin', 0, NULL,         'WAIVED',            NULL,        'not required for this lane', '2026-02-01T00:00:00.000Z', '2026-02-20T00:00:00.000Z'),
  ('dr-5', 'k-hold',   'dt-w1-bill',   1, NULL,         'MISSING',           'u-officer', NULL, '2026-02-02T00:00:00.000Z', '2026-02-02T00:00:00.000Z');

INSERT INTO document_versions (id, requirement_id, version, r2_key, original_name, content_type, byte_size, checksum, uploaded_by, review_state, created_at) VALUES
  ('dv-1', 'dr-1', 1, 'synthetic/dr-1/v1.pdf', 'bill-v1.pdf',   'application/pdf', 1024, 'sha256:synthetic-1', 'u-officer', 'SUPERSEDED', '2026-02-05T00:00:00.000Z'),
  ('dv-2', 'dr-1', 2, 'synthetic/dr-1/v2.pdf', 'bill-v2.pdf',   'application/pdf', 2048, 'sha256:synthetic-2', 'u-officer', 'APPROVED',   '2026-02-15T00:00:00.000Z'),
  ('dv-3', 'dr-2', 1, 'synthetic/dr-2/v1.pdf', 'origin-v1.pdf', 'application/pdf', 3072, 'sha256:synthetic-3', 'u-officer', 'NEEDS_CORRECTION', '2026-02-16T00:00:00.000Z'),
  ('dv-4', 'dr-3', 1, 'synthetic/dr-3/v1.pdf', 'pack-v1.pdf',   'application/pdf', 4096, 'sha256:synthetic-4', 'u-officer', 'UNDER_REVIEW', '2026-02-17T00:00:00.000Z');

INSERT INTO document_reviews (id, version_id, reviewer_id, decision, comment, created_at) VALUES
  ('rv-1', 'dv-2', 'u-ops', 'APPROVED', 'synthetic review', '2026-02-18T00:00:00.000Z'),
  ('rv-2', 'dv-3', 'u-ops', 'NEEDS_CORRECTION', 'synthetic correction', '2026-02-19T00:00:00.000Z');

INSERT INTO physical_original_events (id, case_id, requirement_id, event_type, actor_id, notes, created_at) VALUES
  ('poe-1', 'k-active', 'dr-1', 'RECEIVED', 'u-officer', 'synthetic originals', '2026-02-20T00:00:00.000Z');

INSERT INTO bank_submissions (id, case_id, attempt, bank_name, status, received_at, handed_over_at, handed_over_by, review_decision, created_at, updated_at) VALUES
  ('bs-1', 'k-active', 1, 'Synthetic Bank', 'BANK_REVIEW', NULL, '2026-02-21T00:00:00.000Z', 'u-officer', NULL, '2026-02-21T00:00:00.000Z', '2026-02-25T00:00:00.000Z');

INSERT INTO bank_events (id, submission_id, event_type, reason, actor_id, created_at) VALUES
  ('be-1', 'bs-1', 'HANDED_TO_BANK', 'synthetic handover', 'u-officer', '2026-02-21T00:00:00.000Z'),
  ('be-2', 'bs-1', 'CORRECTION_REQUESTED', 'synthetic correction', 'u-ops', '2026-02-25T00:00:00.000Z');

INSERT INTO courier_shipments (id, case_id, route, sender, carrier, tracking_number, status, sent_at, delivered_at, version, created_at, updated_at) VALUES
  ('cs-1', 'k-active', 'BANK_ROUTE', 'COMPANY', 'Synthetic Courier', 'SYN-0001', 'IN_TRANSIT', '2026-02-26T00:00:00.000Z', NULL, 2, '2026-02-26T00:00:00.000Z', '2026-02-27T00:00:00.000Z');

INSERT INTO courier_tracking_events (id, shipment_id, status, note, event_at, actor_id, source, created_at) VALUES
  ('cte-1', 'cs-1', 'IN_TRANSIT', 'synthetic transit', '2026-02-27T00:00:00.000Z', 'u-officer', 'MANUAL', '2026-02-27T00:00:00.000Z');

INSERT INTO bookings (id, case_id, booking_number, ucr, shipping_line, vessel, voyage, port_of_loading, port_of_discharge, expected_containers, status, planned_loading_date, cutoff_date, planned_etd, planned_eta, version, created_at, updated_at) VALUES
  ('b-1', 'k-active', 'BKG-2026-0001', 'UCR-SYN-0001', 'Synthetic Line', 'MV Synthetic', '001E', 'EGALY', 'NLRTM', 3, 'CONFIRMED', '2026-03-01', '2026-02-27', '2026-03-02', '2026-03-20', 2, '2026-02-10T00:00:00.000Z', '2026-03-01T00:00:00.000Z'),
  ('b-2', 'k-hold',   'BKG-2026-0002', NULL,            'Synthetic Line', 'MV Synthetic', '002E', 'EGDAM', 'DEHAM', 2, 'DRAFT',     NULL,         NULL,         NULL,         NULL,         1, '2026-02-11T00:00:00.000Z', '2026-02-11T00:00:00.000Z');

INSERT INTO containers (id, booking_id, case_id, slot_index, official_number, official_number_override, status, weight_grams, version, created_at, updated_at) VALUES
  ('ct-1', 'b-1', 'k-active', 1, 'SYNU0000001', 0, 'DELIVERED_TO_CUSTOMER', 4200000, 4, '2026-02-10T00:00:00.000Z', '2026-03-25T00:00:00.000Z'),
  ('ct-2', 'b-1', 'k-active', 2, 'SYNU0000002', 0, 'CUSTOMS_RELEASED',      4150000, 4, '2026-02-10T00:00:00.000Z', '2026-03-24T00:00:00.000Z'),
  ('ct-3', 'b-1', 'k-active', 3, 'SYNU0000003', 1, 'ARRIVED_PORT',          4100000, 3, '2026-02-10T00:00:00.000Z', '2026-03-23T00:00:00.000Z'),
  ('ct-4', 'b-2', 'k-hold',   1, NULL,          0, 'PLANNED',               NULL,    1, '2026-02-11T00:00:00.000Z', '2026-02-11T00:00:00.000Z'),
  ('ct-5', 'b-2', 'k-hold',   2, NULL,          0, 'PLANNED',               NULL,    1, '2026-02-11T00:00:00.000Z', '2026-02-11T00:00:00.000Z');

INSERT INTO container_events (id, container_id, status, event_at, is_actual, note, actor_id, created_at) VALUES
  ('cev-1', 'ct-1', 'LOADED',               '2026-03-01T00:00:00.000Z', 1, 'synthetic', 'u-officer', '2026-03-01T00:00:00.000Z'),
  ('cev-2', 'ct-1', 'DELIVERED_TO_CUSTOMER','2026-03-25T00:00:00.000Z', 1, 'synthetic', 'u-officer', '2026-03-25T00:00:00.000Z'),
  ('cev-3', 'ct-2', 'CUSTOMS_RELEASED',     '2026-03-24T00:00:00.000Z', 1, 'synthetic', 'u-officer', '2026-03-24T00:00:00.000Z'),
  ('cev-4', 'ct-3', 'ARRIVED_PORT',         '2026-03-23T00:00:00.000Z', 1, 'synthetic', 'u-officer', '2026-03-23T00:00:00.000Z');

INSERT INTO reminder_rule_definitions (id, family, name_en, name_ar, enabled, scope, offset_amount, offset_direction, offset_unit, day_policy, condition_key, recipient, priority, mandatory, created_at) VALUES
  ('rr-1', 'DOCUMENT', 'Origin certificate chase', 'متابعة شهادة المنشأ', 1, 'COMPANY', 2, 'BEFORE', 'DAYS', 'CALENDAR', 'DOCUMENT_DUE', 'ASSIGNEE', 'NORMAL', 0, '2026-01-01T00:00:00.000Z');

INSERT INTO reminder_instances (id, rule_id, case_id, target_type, target_id, condition_key, generation, due_at, status, dedup_key, owner_user_id, reason, next_action, created_at, updated_at) VALUES
  ('ri-1', 'rr-1', 'k-active', 'DOCUMENT_REQUIREMENT', 'dr-2', 'DOCUMENT_DUE', 1, '2026-03-05T00:00:00.000Z', 'ACTIVE', 'dedup-ri-1', 'u-officer', 'chase origin certificate', 'request corrected origin', '2026-03-02T00:00:00.000Z', '2026-03-02T00:00:00.000Z');

INSERT INTO audit_log (id, actor_id, entity_type, entity_id, action, before_json, after_json, reason, origin, request_id, created_at) VALUES
  ('al-1', 'u-admin', 'export_case', 'k-active', 'case.create', NULL, '{"status":"DRAFT"}', NULL, 'API', 'req-0001', '2026-02-01T00:00:00.000Z'),
  ('al-2', 'u-ops',   'document_version', 'dv-2', 'document.review', NULL, '{"decision":"APPROVED"}', NULL, 'API', 'req-0002', '2026-02-18T00:00:00.000Z'),
  ('al-3', 'u-admin', 'user', 'u-gone', 'user.disable', '{"is_active":1}', '{"is_active":0}', NULL, 'API', 'req-0003', '2026-02-28T00:00:00.000Z');

INSERT INTO case_events (id, case_id, event_type, summary, actor_id, created_at) VALUES
  ('ev-1', 'k-active', 'CASE_CREATED', 'Case created', 'u-admin', '2026-02-01T00:00:00.000Z'),
  ('ev-2', 'k-active', 'DOCUMENT_UPLOADED', 'Version 2 uploaded', 'u-officer', '2026-02-15T00:00:00.000Z'),
  ('ev-3', 'k-hold', 'CASE_HELD', 'Case placed on hold', 'u-ops', '2026-03-02T00:00:00.000Z'),
  ('ev-4', 'k-done', 'CASE_COMPLETED', 'Case completed', 'u-ops', '2026-09-01T00:00:00.000Z');

INSERT INTO idempotency_keys (id, actor_id, idempotency_key, method, path, request_hash, state, status_code, response_body, response_type, created_at, updated_at, expires_at) VALUES
  ('ik-legacy-completed', 'u-admin', 'legacy-key-0001', 'POST', '/api/v1/customers', 'hash-legacy-0001', 'COMPLETED', 201, '{"data":{"id":"c-alex"}}', 'application/json', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('ik-witness-live',     'u-ops',   'witness-key-0001', 'PATCH', '/api/v1/export-cases/k-active', 'hash-witness-0001', 'COMPLETED', 200, '{"data":{"id":"k-active"}}', 'application/json', '2026-10-20T00:00:00.000Z', '2026-10-20T00:00:00.000Z', '2026-11-19T00:00:00.000Z'),
  ('ik-unknown',          'u-officer','unknown-key-0001', 'POST', '/api/v1/bookings', 'hash-unknown-0001', 'UNKNOWN', NULL, NULL, NULL, '2026-10-21T00:00:00.000Z', '2026-10-21T00:00:00.000Z', '2026-11-20T00:00:00.000Z');

INSERT INTO customer_import_operations (id, actor_id, status, total_rows, imported_rows, failed_rows, created_at, updated_at) VALUES
  ('imp-1', 'u-admin', 'COMPLETED', 3, 3, 0, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('imp-2', 'u-ops',   'PARTIAL',   3, 2, 1, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z');

INSERT INTO customer_import_rows (id, import_id, row_index, legal_name, status, customer_id, error_code, error_message, created_at, updated_at) VALUES
  ('ir-1', 'imp-1', 1, 'Alexandria Textiles LLC', 'IMPORTED', 'c-alex', NULL, NULL, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('ir-2', 'imp-1', 2, 'Rotterdam Import BV', 'IMPORTED', 'c-rot', NULL, NULL, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('ir-3', 'imp-1', 3, 'Legacy Partner Co', 'IMPORTED', 'c-legacy', NULL, NULL, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('ir-4', 'imp-2', 1, 'Duplicate Shape Ltd', 'IMPORTED', NULL, NULL, NULL, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('ir-5', 'imp-2', 2, NULL, 'FAILED', NULL, 'LEGAL_NAME_REQUIRED', 'A legal name is required on this row.', '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z');

INSERT INTO login_attempts (id, email, ip, success, created_at) VALUES
  ('la-1', 'admin@w1.invalid', '127.0.0.1', 1, '2026-10-20T00:00:00.000Z'),
  ('la-2', 'admin@w1.invalid', '127.0.0.1', 0, '2026-10-20T00:01:00.000Z');

INSERT INTO custom_field_definitions (id, target_entity, field_key, label_en, label_ar, data_type, required, options_json, sensitive, active, position, created_at) VALUES
  ('cfd-1', 'export_case', 'synthetic_ref', 'Synthetic Reference', 'مرجع اصطناعي', 'text', 0, NULL, 0, 1, 1, '2026-01-01T00:00:00.000Z');

INSERT INTO custom_field_values (id, definition_id, entity_type, entity_id, value_text) VALUES
  ('cfv-1', 'cfd-1', 'export_case', 'k-active', 'SYN-REF-1');
