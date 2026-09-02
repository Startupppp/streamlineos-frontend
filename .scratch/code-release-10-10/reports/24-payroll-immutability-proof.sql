-- Ticket 24 — behavioural proof of payroll financial immutability at the data layer.
-- For each guarded table: insert, transition INTO the frozen state (must succeed),
-- attempt the forbidden mutation (must raise 23514), attempt the PERMITTED
-- post-freeze lifecycle write (must succeed), attempt DELETE (must raise).
-- Then the two cascade escape hatches: a user purge and an organisation purge.

\set ON_ERROR_STOP on
\timing off

CREATE OR REPLACE FUNCTION t24_expect_raise(p_label text, p_sql text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS  refused  %  [%]', p_label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL  % — the forbidden write SUCCEEDED', p_label;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION t24_expect_ok(p_label text, p_sql text) RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
  RAISE NOTICE 'PASS  allowed  %', p_label;
END $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- fixture
BEGIN;

INSERT INTO users (id, email) VALUES
  ('t24_user',  't24-user@example.test'),
  ('t24_user2', 't24-user2@example.test');

INSERT INTO organizations (id, name, slug, owner_membership_id)
VALUES ('t24_org', 'T24 Proof Org', 't24-proof-org', -1);

WITH m AS (
  INSERT INTO organization_members (user_id, org_id) VALUES ('t24_user', 't24_org') RETURNING id
)
UPDATE organizations SET owner_membership_id = (SELECT id FROM m) WHERE id = 't24_org';

-- run A = the regular run; run B = an adjustment run in the same month
INSERT INTO payroll_runs (id, org_id, month, run_type, status)
VALUES (900001, 't24_org', '2027-04', 'REGULAR', 'DRAFT'),
       (900002, 't24_org', '2027-04', 'BONUS',   'DRAFT');

INSERT INTO payroll_run_employees (id, org_id, run_id, user_id, status, gross, net)
VALUES (900011, 't24_org', 900001, 't24_user', 'CALCULATED', '50000.00', '45000.00');

INSERT INTO payroll_line_items
  (id, org_id, run_id, run_employee_id, code, name, category, amount, calc_method, calc_explain)
VALUES (900021, 't24_org', 900001, 900011, 'BASIC', 'Basic', 'EARNING', '50000.00', 'FIXED', '{}'::jsonb);

COMMIT;

-- =============================================== 1. payroll_journal_batches
BEGIN;
INSERT INTO payroll_journal_batches
  (id, org_id, run_id, period_key, source_hash, total_debits, total_credits, line_count, status)
VALUES (900101, 't24_org', 900001, '2027-04', 'hash-a', '100.00', '100.00', 1, 'DRAFT');

SELECT t24_expect_ok('journal_batches: DRAFT amounts are writable',
  $q$UPDATE payroll_journal_batches SET total_debits = '150.00' WHERE id = 900101$q$);

SELECT t24_expect_ok('journal_batches: transition DRAFT -> POSTED',
  $q$UPDATE payroll_journal_batches SET status='POSTED', posted_at=now() WHERE id = 900101$q$);

SELECT t24_expect_raise('journal_batches: rewrite total_debits once POSTED',
  $q$UPDATE payroll_journal_batches SET total_debits = '999.00' WHERE id = 900101$q$);
SELECT t24_expect_raise('journal_batches: rewrite source_hash once POSTED',
  $q$UPDATE payroll_journal_batches SET source_hash = 'tampered' WHERE id = 900101$q$);
SELECT t24_expect_raise('journal_batches: delete once POSTED',
  $q$DELETE FROM payroll_journal_batches WHERE id = 900101$q$);

SELECT t24_expect_ok('journal_batches: markExported lifecycle still works',
  $q$UPDATE payroll_journal_batches SET status='EXPORTED', exported_at=now() WHERE id = 900101$q$);
SELECT t24_expect_ok('journal_batches: reconcile lifecycle still works',
  $q$UPDATE payroll_journal_batches SET reconciliation_status='RECONCILED', reconciled_at=now() WHERE id = 900101$q$);
COMMIT;

-- ========================================== 2. payroll_journal_batch_lines
BEGIN;
INSERT INTO payroll_journal_batches
  (id, org_id, run_id, period_key, source_hash, total_debits, total_credits, line_count, status)
VALUES (900102, 't24_org', 900001, '2027-05', 'hash-b', '100.00', '100.00', 1, 'DRAFT');

INSERT INTO payroll_journal_batch_lines (id, org_id, batch_id, line_no, account, description, debit, credit)
VALUES (900201, 't24_org', 900102, 1, '5000', 'Salaries', '100.00', '0.00');

SELECT t24_expect_ok('journal_batch_lines: writable while batch is DRAFT',
  $q$UPDATE payroll_journal_batch_lines SET debit = '120.00' WHERE id = 900201$q$);

SELECT t24_expect_ok('journal_batch_lines: transition parent DRAFT -> POSTED',
  $q$UPDATE payroll_journal_batches SET status='POSTED', posted_at=now() WHERE id = 900102$q$);

SELECT t24_expect_raise('journal_batch_lines: rewrite debit once batch POSTED',
  $q$UPDATE payroll_journal_batch_lines SET debit = '999.00' WHERE id = 900201$q$);
SELECT t24_expect_raise('journal_batch_lines: delete once batch POSTED',
  $q$DELETE FROM payroll_journal_batch_lines WHERE id = 900201$q$);
COMMIT;

-- ================================================ 3. payroll_bank_batches
BEGIN;
INSERT INTO payroll_bank_batches
  (id, org_id, run_id, batch_number, format, total_amount, item_count, status)
VALUES (900301, 't24_org', 900001, 'T24-BATCH-1', 'NEFT', '45000.00', 1, 'DRAFT');

SELECT t24_expect_ok('bank_batches: DRAFT amounts are writable',
  $q$UPDATE payroll_bank_batches SET total_amount = '45001.00' WHERE id = 900301$q$);

SELECT t24_expect_ok('bank_batches: transition DRAFT -> SENT',
  $q$UPDATE payroll_bank_batches SET status='SENT', sent_at=now() WHERE id = 900301$q$);

SELECT t24_expect_raise('bank_batches: rewrite total_amount once SENT',
  $q$UPDATE payroll_bank_batches SET total_amount = '1.00' WHERE id = 900301$q$);
SELECT t24_expect_raise('bank_batches: repoint run_id once SENT',
  $q$UPDATE payroll_bank_batches SET run_id = 900002 WHERE id = 900301$q$);
SELECT t24_expect_raise('bank_batches: delete once SENT',
  $q$DELETE FROM payroll_bank_batches WHERE id = 900301$q$);

SELECT t24_expect_ok('bank_batches: post-commit file_key hook still works',
  $q$UPDATE payroll_bank_batches SET file_key = 's3://t24/batch-1.csv' WHERE id = 900301$q$);
SELECT t24_expect_ok('bank_batches: SENT -> PAID lifecycle still works',
  $q$UPDATE payroll_bank_batches SET status='PAID' WHERE id = 900301$q$);
COMMIT;

-- =========================================== 4. payroll_bank_batch_items
BEGIN;
INSERT INTO payroll_bank_batches
  (id, org_id, run_id, batch_number, format, total_amount, item_count, status)
VALUES (900302, 't24_org', 900001, 'T24-BATCH-2', 'NEFT', '45000.00', 1, 'DRAFT');

INSERT INTO payroll_bank_batch_items
  (id, org_id, batch_id, run_employee_id, user_id, amount, account_masked, status)
VALUES (900401, 't24_org', 900302, 900011, 't24_user', '45000.00', 'XXXX1234', 'PENDING');

SELECT t24_expect_ok('bank_batch_items: writable while batch is DRAFT',
  $q$UPDATE payroll_bank_batch_items SET amount = '45500.00' WHERE id = 900401$q$);

SELECT t24_expect_ok('bank_batch_items: release the parent batch DRAFT -> SENT',
  $q$UPDATE payroll_bank_batches SET status='SENT', sent_at=now() WHERE id = 900302$q$);

SELECT t24_expect_raise('bank_batch_items: rewrite amount once released',
  $q$UPDATE payroll_bank_batch_items SET amount = '1.00' WHERE id = 900401$q$);
SELECT t24_expect_raise('bank_batch_items: rewrite account_masked once released',
  $q$UPDATE payroll_bank_batch_items SET account_masked = 'XXXX9999' WHERE id = 900401$q$);
SELECT t24_expect_raise('bank_batch_items: delete once released',
  $q$DELETE FROM payroll_bank_batch_items WHERE id = 900401$q$);

SELECT t24_expect_ok('bank_batch_items: markItemPaid lifecycle still works',
  $q$UPDATE payroll_bank_batch_items SET status='PAID', transaction_ref='UTR1', paid_at=now() WHERE id = 900401$q$);
COMMIT;

-- ==================================================== 5. payroll_filings
BEGIN;
INSERT INTO payroll_filings (id, org_id, filing_type, fiscal_year, status, payload)
VALUES (900501, 't24_org', 'TDS_24Q', '2027-2028', 'DRAFT', '{"q":1}'::jsonb);

SELECT t24_expect_ok('filings: payload writable before submission',
  $q$UPDATE payroll_filings SET payload = '{"q":1,"v":2}'::jsonb WHERE id = 900501$q$);

SELECT t24_expect_ok('filings: transition DRAFT -> SUBMITTED',
  $q$UPDATE payroll_filings SET status='SUBMITTED', submitted_at=now() WHERE id = 900501$q$);

SELECT t24_expect_raise('filings: rewrite payload once submitted',
  $q$UPDATE payroll_filings SET payload = '{"tampered":true}'::jsonb WHERE id = 900501$q$);
SELECT t24_expect_raise('filings: rewrite fiscal_year once submitted',
  $q$UPDATE payroll_filings SET fiscal_year = '2026-2027' WHERE id = 900501$q$);
SELECT t24_expect_raise('filings: delete once submitted',
  $q$DELETE FROM payroll_filings WHERE id = 900501$q$);

SELECT t24_expect_ok('filings: attachAcknowledgement lifecycle still works',
  $q$UPDATE payroll_filings SET status='ACKNOWLEDGED', acknowledgement_ref='ACK-1', challan_ref='CH-1' WHERE id = 900501$q$);
COMMIT;

-- ============================================= 6. payroll_tds_ytd_ledger
BEGIN;
-- writeTdsYtdLedger runs inside commitLock, so the run is already LOCKED when the
-- ledger row is written. LOCKED is deliberately NOT in the frozen set.
SELECT t24_expect_ok('tds_ytd: transition the run DRAFT -> LOCKED (0445 covers the run children)',
  $q$UPDATE payroll_runs SET status='LOCKED', locked_at=now() WHERE id = 900001$q$);

INSERT INTO payroll_tds_ytd_ledger
  (id, org_id, user_id, fiscal_year, period_key, run_id, taxable_income_paise, tds_paise)
VALUES (900601, 't24_org', 't24_user', '2027-2028', '2027-04', 900001, 5000000, 250000);

SELECT t24_expect_ok('tds_ytd: the reopen -> re-lock upsert while the run is LOCKED',
  $q$INSERT INTO payroll_tds_ytd_ledger
       (org_id, user_id, fiscal_year, period_key, run_id, taxable_income_paise, tds_paise)
     VALUES ('t24_org','t24_user','2027-2028','2027-04',900001,5100000,260000)
     ON CONFLICT (org_id, user_id, fiscal_year, period_key) WHERE user_id IS NOT NULL
     DO UPDATE SET run_id = excluded.run_id,
                   taxable_income_paise = excluded.taxable_income_paise,
                   tds_paise = excluded.tds_paise$q$);

-- the run is paid out; LOCKED -> PAID is the only way in, and PAID never returns
SELECT t24_expect_ok('tds_ytd: transition the run LOCKED -> PAID',
  $q$UPDATE payroll_runs SET status='PAID', paid_at=now() WHERE id = 900001$q$);

SELECT t24_expect_raise('tds_ytd: reduce tds_paise once the run is PAID',
  $q$UPDATE payroll_tds_ytd_ledger SET tds_paise = 0 WHERE id = 900601$q$);
SELECT t24_expect_raise('tds_ytd: rewrite taxable_income_paise once the run is PAID',
  $q$UPDATE payroll_tds_ytd_ledger SET taxable_income_paise = 1 WHERE id = 900601$q$);
SELECT t24_expect_raise('tds_ytd: move the row to another taxpayer once the run is PAID',
  $q$UPDATE payroll_tds_ytd_ledger SET user_id = 't24_user2' WHERE id = 900601$q$);
SELECT t24_expect_raise('tds_ytd: move the row to another tax period once the run is PAID',
  $q$UPDATE payroll_tds_ytd_ledger SET period_key = '2027-05' WHERE id = 900601$q$);
SELECT t24_expect_raise('tds_ytd: repoint run_id once the run is PAID',
  $q$UPDATE payroll_tds_ytd_ledger SET run_id = 900002 WHERE id = 900601$q$);
SELECT t24_expect_raise('tds_ytd: delete once the run is PAID',
  $q$DELETE FROM payroll_tds_ytd_ledger WHERE id = 900601$q$);

-- the real-world destructive path: locking the BONUS run for the same month
-- replays writeTdsYtdLedger's exact upsert and would overwrite the paid run's figures
SELECT t24_expect_raise('tds_ytd: an adjustment run overwriting the paid month (writeTdsYtdLedger upsert)',
  $q$INSERT INTO payroll_tds_ytd_ledger
       (org_id, user_id, fiscal_year, period_key, run_id, taxable_income_paise, tds_paise)
     VALUES ('t24_org','t24_user','2027-2028','2027-04',900002,900000,45000)
     ON CONFLICT (org_id, user_id, fiscal_year, period_key) WHERE user_id IS NOT NULL
     DO UPDATE SET run_id = excluded.run_id,
                   taxable_income_paise = excluded.taxable_income_paise,
                   tds_paise = excluded.tds_paise$q$);

-- an unrelated period keeps working: a fresh INSERT is never guarded
SELECT t24_expect_ok('tds_ytd: the next month still inserts',
  $q$INSERT INTO payroll_tds_ytd_ledger
       (org_id, user_id, fiscal_year, period_key, run_id, taxable_income_paise, tds_paise)
     VALUES ('t24_org','t24_user','2027-2028','2027-05',900002,5000000,250000)$q$);
COMMIT;

-- =========================================== 7. cascade escape hatches
BEGIN;
INSERT INTO payroll_tds_ytd_ledger
  (id, org_id, user_id, fiscal_year, period_key, run_id, taxable_income_paise, tds_paise)
VALUES (900602, 't24_org', 't24_user2', '2027-2028', '2027-04', 900001, 3000000, 100000);

SELECT t24_expect_ok('user purge cascades through the frozen ledger row',
  $q$DELETE FROM users WHERE id = 't24_user2'$q$);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM payroll_tds_ytd_ledger WHERE id = 900602) THEN
    RAISE EXCEPTION 'FAIL  user purge left the ledger row behind';
  END IF;
  RAISE NOTICE 'PASS  user purge removed the frozen ledger row';
END $$;
COMMIT;

-- the organisation purge, exactly what cron-org-purge-worker.service.ts:241 issues
BEGIN;
SELECT t24_expect_ok('organisation purge with a PAID run and eight guarded tables populated',
  $q$DELETE FROM organizations WHERE id = 't24_org'$q$);

DO $$
DECLARE left_over text;
BEGIN
  SELECT string_agg(t.name || '=' || t.n, ', ') INTO left_over
  FROM (
    SELECT 'payroll_runs' AS name, count(*) AS n FROM payroll_runs WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_run_employees', count(*) FROM payroll_run_employees WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_line_items', count(*) FROM payroll_line_items WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_journal_batches', count(*) FROM payroll_journal_batches WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_journal_batch_lines', count(*) FROM payroll_journal_batch_lines WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_bank_batches', count(*) FROM payroll_bank_batches WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_bank_batch_items', count(*) FROM payroll_bank_batch_items WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_filings', count(*) FROM payroll_filings WHERE org_id = 't24_org'
    UNION ALL SELECT 'payroll_tds_ytd_ledger', count(*) FROM payroll_tds_ytd_ledger WHERE org_id = 't24_org'
  ) t
  WHERE t.n > 0;
  IF left_over IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL  organisation purge left rows: %', left_over;
  END IF;
  RAISE NOTICE 'PASS  organisation purge left 0 rows in all nine payroll tables';
END $$;

DELETE FROM users WHERE id = 't24_user';
COMMIT;

DROP FUNCTION t24_expect_raise(text, text);
DROP FUNCTION t24_expect_ok(text, text);

\echo 'T24 IMMUTABILITY PROOF COMPLETE'
