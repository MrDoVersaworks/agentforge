ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "agents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "refresh_tokens" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "refresh_tokens" ADD COLUMN IF NOT EXISTS "session_id" uuid DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE IF EXISTS "refresh_tokens" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "refresh_tokens" SET "session_id" = gen_random_uuid() WHERE "session_id" IS NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "system_settings" ADD COLUMN IF NOT EXISTS "privacy_policy_content" text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "system_settings" ADD COLUMN IF NOT EXISTS "terms_of_service_content" text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "platform_reviews" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
UPDATE "platform_reviews" SET "status" = 'approved' WHERE "status" = 'pending';
