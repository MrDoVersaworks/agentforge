ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "encrypted_resend_key";
--> statement-breakpoint
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "resend_key_iv";
--> statement-breakpoint
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "resend_key_tag";
--> statement-breakpoint
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "notification_email";
