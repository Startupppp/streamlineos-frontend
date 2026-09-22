DROP TABLE IF EXISTS pd_scan;
CREATE TEMP TABLE pd_scan AS
WITH cols AS (
  SELECT c.table_schema AS s, c.table_name AS t, c.column_name AS col, c.data_type AS dt
  FROM information_schema.columns c
  JOIN information_schema.tables tb
    ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
  WHERE c.table_schema IN ('public','build','build_events')
)
SELECT s,t,col,dt,
  CASE
    WHEN col ~ '(^|_)(dob|date_of_birth|birth_date|birthdate)($|_)' THEN 'date_of_birth'
    WHEN col ~ 'biometric|fingerprint|face_(id|template)|iris_' THEN 'biometric'
    WHEN col ~ 'signature' AND col !~ 'signature_(algo|alg|version|scheme)' THEN 'signature'
    WHEN col ~ '(^|_)(pan|pan_number|tan|gstin|gst_number|aadhaar|aadhar|uan|esi_code|esic|passport|national_id|ssn|nid|tax_id|tin|pf_number)($|_)' THEN 'govt_identifier'
    WHEN col ~ 'ifsc|iban|swift|upi_id|vpa|account_number|bank_account|bank_name|card_last4|card_number|routing|bank_details|beneficiary' THEN 'bank_payment'
    WHEN col ~ 'salary|compensation|ctc|gross_pay|net_pay|wage|payslip|bonus|(^|_)pay_(rate|amount)|hourly_rate|remuneration|stipend' THEN 'compensation'
    WHEN col ~ 'email|mailbox_address|recipient_address' THEN 'email'
    WHEN col ~ '(^|_)(phone|mobile|msisdn|whatsapp|telephone)|phone$|_phone$' THEN 'phone'
    WHEN col ~ 'ip_address|(^|_)ip($|_)|user_agent|device_id|device_fingerprint' THEN 'ip_device'
    WHEN col ~ '(^|_)(lat|lng|latitude|longitude|geo_lat|geo_lng)($|_)' THEN 'geolocation'
    WHEN col ~ 'avatar|photo|profile_(image|picture)|headshot' THEN 'photo_avatar'
    WHEN col ~ 'address|street|postal|pincode|(^|_)zip($|_)|locality|(^|_)city($|_)|city$' AND col !~ 'ip_address|mac_address|recipient_address|mailbox_address|email_address|address_hash' THEN 'address'
    WHEN col ~ 'medical|health_(condition|record|note)|blood_group|disability|diagnosis|illness|gender|nationality|marital|religion|caste|ethnic|sexual_orientation|union_member' AND col !~ 'health_(score|status|check|state)' THEN 'special_category'
    WHEN col ~ '(first|last|middle|full|given|family|maiden|preferred|display|legal)_name|emergency_contact|nominee|spouse|father_name|mother_name|guardian' THEN 'person_name'
    WHEN col ~ 'password|token_hash|(^|_)secret($|_)|secret$|api_key|access_token|refresh_token|id_token|totp|otp_code|private_key|credential|session_token' THEN 'credential'
    ELSE NULL END AS klass
FROM cols;
SELECT 'TOTAL_DIRECT_COLUMNS', count(*) FROM pd_scan WHERE klass IS NOT NULL;
SELECT 'TOTAL_DISTINCT_TABLES', count(DISTINCT s||'.'||t) FROM pd_scan WHERE klass IS NOT NULL;
\copy (SELECT klass,s,t,col,dt FROM pd_scan WHERE klass IS NOT NULL ORDER BY klass,s,t,col) TO 'pd-columns.csv' CSV HEADER
