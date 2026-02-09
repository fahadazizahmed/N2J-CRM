-- Migration: Update unique constraint from email to email+role
-- This allows same email with different roles

-- Step 1: Drop the old unique constraint on email
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";

-- Step 2: Add composite unique constraint on email + role
ALTER TABLE "users" ADD CONSTRAINT "email_role_unique" UNIQUE ("email", "role");

-- Verify the constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'users';
