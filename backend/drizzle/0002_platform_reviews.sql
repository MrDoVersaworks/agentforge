CREATE TABLE IF NOT EXISTS "platform_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "profession" varchar(255),
  "rating" real DEFAULT 5 NOT NULL,
  "feedback" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
