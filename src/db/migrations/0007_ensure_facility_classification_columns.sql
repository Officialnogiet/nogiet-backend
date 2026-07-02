ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "sub_sector" varchar(20) DEFAULT 'Upstream' NOT NULL;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "oilfield" varchar(255);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "geographic_location" varchar(20);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "custom_field_1" text;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "custom_field_2" text;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "custom_field_3" text;
