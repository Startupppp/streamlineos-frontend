-- Fix for employees onboarded BEFORE the emailVerified fix (commit 110fc93)
-- These users have emailVerified = NULL and cannot log in
-- Run this against your production database to fix existing stuck accounts

UPDATE users
SET email_verified = NOW()
WHERE email_verified IS NULL
  AND password IS NOT NULL
  AND is_active = true;

-- Verify the fix
SELECT id, name, email, email_verified, is_active
FROM users
WHERE email_verified IS NULL AND password IS NOT NULL;
