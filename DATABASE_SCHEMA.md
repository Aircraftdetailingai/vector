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

## 6. Create `detailer_services` table

```sql
CREATE TABLE IF NOT EXISTS detailer_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  service_key VARCHAR(100) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(50) DEFAULT 'other',
  hourly_rate DECIMAL(10,2) DEFAULT 75,
  default_hours DECIMAL(10,2) DEFAULT 1,
  requires_return_trip BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detailer_services_detailer ON detailer_services(detailer_id);
CREATE INDEX IF NOT EXISTS idx_detailer_services_category ON detailer_services(category);
```

## 7. Create `reward_redemptions` table

```sql
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  reward_id VARCHAR(50) NOT NULL,
  reward_name VARCHAR(255) NOT NULL,
  points_spent INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reward_redemptions_detailer ON reward_redemptions(detailer_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);
```

## 8. Add currency column to detailers

```sql
ALTER TABLE detailers
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
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

---

# Vendor Marketplace Schema

Run these SQL commands to enable the vendor marketplace.

## 9. Create `vendors` table

```sql
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  website VARCHAR(500),
  logo VARCHAR(500),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  commission_tier VARCHAR(20) DEFAULT 'basic',
  stripe_account_id VARCHAR(255),
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  payout_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_tier ON vendors(commission_tier);
```

## 10. Create `vendor_products` table

```sql
CREATE TABLE IF NOT EXISTS vendor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  images JSONB DEFAULT '[]',
  sku VARCHAR(100),
  stock INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendor_products_vendor ON vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_status ON vendor_products(status);
CREATE INDEX idx_vendor_products_category ON vendor_products(category);
```

## 11. Create `vendor_orders` table

```sql
CREATE TABLE IF NOT EXISTS vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES vendor_products(id),
  detailer_id UUID NOT NULL REFERENCES detailers(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  vendor_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  stripe_session_id VARCHAR(255),
  shipping_address JSONB,
  tracking_number VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_vendor_orders_vendor ON vendor_orders(vendor_id);
CREATE INDEX idx_vendor_orders_detailer ON vendor_orders(detailer_id);
CREATE INDEX idx_vendor_orders_status ON vendor_orders(status);
```

## 12. Create `vendor_payouts` table

```sql
CREATE TABLE IF NOT EXISTS vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  stripe_payout_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX idx_vendor_payouts_status ON vendor_payouts(status);
```

## 13. Create `shop_orders` table (detailer cart orders)

```sql
CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_shop_orders_detailer ON shop_orders(detailer_id);
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_stripe ON shop_orders(stripe_session_id);
```

## Commission Tiers

| Tier | Commission Rate | Description |
|------|-----------------|-------------|
| Basic | 10% | Default tier for new vendors |
| Pro | 25% | Featured placement, priority support |
| Partner | 60% | Premium placement, dedicated account manager |

---

# Customer Portal Schema

Run these SQL commands to enable the customer portal.

## 14. Create `customer_login_codes` table

```sql
CREATE TABLE IF NOT EXISTS customer_login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customer_login_codes_email ON customer_login_codes(email);
```

## 15. Create `customer_messages` table

```sql
CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  sender VARCHAR(20) NOT NULL DEFAULT 'customer',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_messages_detailer ON customer_messages(detailer_id);
CREATE INDEX idx_customer_messages_email ON customer_messages(customer_email);
CREATE INDEX idx_customer_messages_quote ON customer_messages(quote_id);
```

---

# AI Lead Intake Schema

Run these SQL commands to enable AI lead intake.

## 16. Create `intake_questions` table

```sql
CREATE TABLE IF NOT EXISTS intake_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  question_key VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  placeholder VARCHAR(255),
  required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  question_type VARCHAR(20) DEFAULT 'text',
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intake_questions_detailer ON intake_questions(detailer_id);
CREATE INDEX idx_intake_questions_order ON intake_questions(display_order);
```

## 17. Create `intake_faqs` table

```sql
CREATE TABLE IF NOT EXISTS intake_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID UNIQUE NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  faqs JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_intake_faqs_detailer ON intake_faqs(detailer_id);
```

## 18. Create `intake_leads` table

```sql
CREATE TABLE IF NOT EXISTS intake_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  answers JSONB DEFAULT '{}',
  source VARCHAR(50) DEFAULT 'widget',
  status VARCHAR(20) DEFAULT 'new',
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intake_leads_detailer ON intake_leads(detailer_id);
CREATE INDEX idx_intake_leads_status ON intake_leads(status);
CREATE INDEX idx_intake_leads_created ON intake_leads(created_at);
```

## Lead Status Flow

| Status | Description |
|--------|-------------|
| new | Just created from widget |
| contacted | Detailer has reached out |
| converted | Converted to a quote |
| closed | Lead closed (not interested) |

---

# Minimum Fee & Change Orders Schema

Run these SQL commands to enable minimum fees and change orders.

## 19. Add minimum fee columns to `detailers` table

```sql
ALTER TABLE detailers
ADD COLUMN IF NOT EXISTS minimum_callout_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_fee_locations JSONB DEFAULT '[]';
```

## 20. Add minimum fee and scheduling columns to `quotes` table

```sql
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS job_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS minimum_fee_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;
```

## 21. Create `change_orders` table

```sql
CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  services JSONB NOT NULL DEFAULT '[]',
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approval_token VARCHAR(255) UNIQUE,
  stripe_session_id VARCHAR(255),
  payment_intent_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_change_orders_quote ON change_orders(quote_id);
CREATE INDEX idx_change_orders_detailer ON change_orders(detailer_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_change_orders_token ON change_orders(approval_token);
```

## Change Order Status Flow

| Status | Description |
|--------|-------------|
| pending | Sent to customer, awaiting response |
| approved | Customer approved and paid |
| declined | Customer declined |

## Change Order Services Format

The `services` JSONB column stores an array of additional services:

```json
[
  {
    "name": "Carpet Shampoo",
    "description": "Deep carpet cleaning",
    "amount": 150.00
  },
  {
    "name": "Engine Detail",
    "amount": 200.00
  }
]
```
