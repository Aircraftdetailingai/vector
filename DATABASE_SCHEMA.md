# Database Schema Changes for Gamification

Run these SQL commands in Supabase to enable the gamification system.

## 1. Add columns to `detailers` table

```sql
ALTER TABLE detailers
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tips_enabled BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tips_frequency VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_subscription JSONB DEFAULT NULL;
```

## 2. Create `points_history` table

```sql
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_points_history_detailer ON points_history(detailer_id);
CREATE INDEX idx_points_history_created ON points_history(created_at);
CREATE INDEX idx_points_history_reason ON points_history(reason);
```

## 3. Create `products` table

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  cost_per_oz DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_detailer ON products(detailer_id);
CREATE INDEX idx_products_category ON products(category);
```

## 4. Create `product_usage` table

```sql
CREATE TABLE IF NOT EXISTS product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  amount_used DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'oz',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_usage_quote ON product_usage(quote_id);
CREATE INDEX idx_product_usage_product ON product_usage(product_id);
```

## 5. Create `service_categories` table

```sql
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key VARCHAR(50) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_service_categories_detailer ON service_categories(detailer_id);
CREATE UNIQUE INDEX idx_service_categories_key ON service_categories(detailer_id, key);
```

## 6. Update `detailer_services` table (if exists)

```sql
-- Add category column if not exists
ALTER TABLE detailer_services
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other',
ADD COLUMN IF NOT EXISTS requires_return_trip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_detailer_services_category ON detailer_services(category);
```

## Point Values

| Action | Points |
|--------|--------|
| Booking (per dollar) | 2 |
| Complete profile | 50 |
| First quote sent | 25 |
| First payment | 100 |
| Log product usage | 10 |
| Complete tip task | 20 |
| Daily login | 5 |
