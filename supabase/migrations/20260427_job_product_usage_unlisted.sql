ALTER TABLE job_product_usage ADD COLUMN IF NOT EXISTS is_unlisted boolean DEFAULT false;
ALTER TABLE job_product_usage ADD COLUMN IF NOT EXISTS product_brand text;
