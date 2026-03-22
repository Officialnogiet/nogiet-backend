CREATE TABLE "satellite_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" varchar(255) NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"sector" varchar(100),
	"gas" varchar(10) DEFAULT 'CH4',
	"emission_rate" real,
	"persistence" real,
	"plume_count" integer,
	"instrument" varchar(100),
	"first_detected" varchar(50),
	"last_detected" varchar(50),
	"bbox_region" varchar(60) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_sat_bbox_region" ON "satellite_sources" USING btree ("bbox_region");--> statement-breakpoint
CREATE INDEX "idx_sat_source_name" ON "satellite_sources" USING btree ("source_name");