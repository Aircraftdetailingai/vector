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

## 3. Create `products` table (Inventory Tracking)

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  unit VARCHAR(20) DEFAULT 'oz',
  cost_per_unit DECIMAL(10,2) DEFAULT 0,
  current_quantity DECIMAL(10,2) DEFAULT 0,
  reorder_threshold DECIMAL(10,2) DEFAULT 0,
  supplier VARCHAR(255) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_detailer ON products(detailer_id);
CREATE INDEX idx_products_category ON products(category);
```

## 3b. Create `equipment` table (Tool/Equipment Tracking)

```sql
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  purchase_price DECIMAL(10,2) DEFAULT 0,
  purchase_date DATE,
  jobs_completed INTEGER DEFAULT 0,
  maintenance_notes TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equipment_detailer ON equipment(detailer_id);
CREATE INDEX idx_equipment_category ON equipment(category);
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

---

# Smart Business Intelligence Schema

Run these SQL commands to enable the smart recommendations system.

## 22. Create `job_completion_logs` table

```sql
CREATE TABLE IF NOT EXISTS job_completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255),
  actual_hours DECIMAL(10,2),
  quoted_hours DECIMAL(10,2),
  wait_time_minutes INTEGER DEFAULT 0,
  repositioning_needed BOOLEAN DEFAULT false,
  customer_late BOOLEAN DEFAULT false,
  products_used JSONB DEFAULT '[]',
  product_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  issues TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_completion_logs_quote ON job_completion_logs(quote_id);
CREATE INDEX idx_job_completion_logs_detailer ON job_completion_logs(detailer_id);
CREATE INDEX idx_job_completion_logs_customer ON job_completion_logs(customer_email);
CREATE INDEX idx_job_completion_logs_created ON job_completion_logs(created_at);
```

## 23. Create `customer_stats` table

```sql
CREATE TABLE IF NOT EXISTS customer_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  total_jobs INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_wait_time_minutes INTEGER DEFAULT 0,
  total_repositioning_events INTEGER DEFAULT 0,
  total_late_arrivals INTEGER DEFAULT 0,
  avg_days_to_pay DECIMAL(10,2) DEFAULT 0,
  last_rate_increase_date DATE,
  last_job_date DATE,
  first_job_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(detailer_id, customer_email)
);

CREATE INDEX idx_customer_stats_detailer ON customer_stats(detailer_id);
CREATE INDEX idx_customer_stats_email ON customer_stats(customer_email);
```

## 24. Create `smart_recommendations` table

```sql
CREATE TABLE IF NOT EXISTS smart_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 5,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  acted_on BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  acted_on_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recommendations_detailer ON smart_recommendations(detailer_id);
CREATE INDEX idx_recommendations_type ON smart_recommendations(type);
CREATE INDEX idx_recommendations_active ON smart_recommendations(detailer_id, acted_on, dismissed);
```

## Recommendation Types

| Type | Description |
|------|-------------|
| rate_increase | Customer hasn't had rate increase in X months |
| problem_customer | Customer has high wait time or other issues |
| profitability | Service or customer profitability insights |
| upsell | Opportunity to upsell services |
| market_rate | Detailer rates vs market average |
| time_accuracy | Quoted time vs actual time drift |
| payment_terms | Customers with slow payment patterns |

## Points for Business Intelligence

| Action | Points |
|--------|--------|
| Log wait time | 10 |
| Log repositioning | 10 |
| Complete post-job survey | 20 |
| Act on recommendation | 50 |

---

# ROI Tracking Schema

Run these SQL commands to enable ROI tracking and testimonials.

## 25. Create `detailer_baselines` table

```sql
CREATE TABLE IF NOT EXISTS detailer_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID UNIQUE NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  annual_revenue_estimate DECIMAL(12,2),
  quote_creation_time_minutes INTEGER,
  quote_conversion_rate INTEGER,
  admin_hours_per_week DECIMAL(5,2),
  hourly_rate_at_signup DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_detailer_baselines_detailer ON detailer_baselines(detailer_id);
```

## 26. Create `roi_metrics` table (cached daily calculations)

```sql
CREATE TABLE IF NOT EXISTS roi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL DEFAULT 'all_time',
  period_start DATE,
  period_end DATE,
  quotes_created INTEGER DEFAULT 0,
  quotes_sent INTEGER DEFAULT 0,
  quotes_paid INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_quote_creation_seconds INTEGER,
  conversion_rate DECIMAL(5,2),
  upsells_count INTEGER DEFAULT 0,
  upsells_revenue DECIMAL(12,2) DEFAULT 0,
  wait_fees_recovered DECIMAL(12,2) DEFAULT 0,
  rate_increases_revenue DECIMAL(12,2) DEFAULT 0,
  time_saved_hours DECIMAL(10,2) DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(detailer_id, period, period_start)
);

CREATE INDEX idx_roi_metrics_detailer ON roi_metrics(detailer_id);
CREATE INDEX idx_roi_metrics_period ON roi_metrics(period);
```

## 27. Create `testimonials` table

```sql
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  milestone VARCHAR(50),
  revenue_at_time DECIMAL(12,2),
  approved BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_testimonials_detailer ON testimonials(detailer_id);
CREATE INDEX idx_testimonials_approved ON testimonials(approved);
CREATE INDEX idx_testimonials_featured ON testimonials(featured);
```

## 28. Add ROI tracking columns to `detailers` table

```sql
ALTER TABLE detailers
ADD COLUMN IF NOT EXISTS roi_email_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_roi_email_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_testimonial_prompt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS testimonial_given BOOLEAN DEFAULT false;
```

## 29. Add quote timing tracking to `quotes` table

```sql
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS creation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS creation_seconds INTEGER;
```

## ROI Milestones for Testimonial Prompts

| Milestone | Trigger |
|-----------|---------|
| first_10k | $10,000 booked through Vector |
| first_25k | $25,000 booked through Vector |
| first_50k | $50,000 booked through Vector |
| first_100k | $100,000 booked through Vector |
| time_saved_100h | 100+ hours saved |
| one_year | 1 year anniversary |

---

# Job Documentation System

Run these SQL commands to enable job photo/video documentation.

## 30. Create `job_media` table

```sql
CREATE TABLE IF NOT EXISTS job_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_media_quote ON job_media(quote_id);
CREATE INDEX idx_job_media_detailer ON job_media(detailer_id);
CREATE INDEX idx_job_media_type ON job_media(media_type);
```

## Media Types

| Type | Description |
|------|-------------|
| before_video | Walk-around video before starting |
| before_photo | Photo of condition before starting |
| after_photo | Photo of completed work |
| after_video | Walk-around video of completed work |

## 31. Create `dismissed_reminders` table

```sql
CREATE TABLE IF NOT EXISTS dismissed_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  action VARCHAR(20) DEFAULT 'dismissed',
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(detailer_id, quote_id, reminder_type)
);

CREATE INDEX idx_dismissed_reminders_detailer ON dismissed_reminders(detailer_id);
CREATE INDEX idx_dismissed_reminders_quote ON dismissed_reminders(quote_id);
```

## Documentation Points

| Action | Points |
|--------|--------|
| Upload before video | 15 |
| Upload before photo | 10 |
| Upload after photo | 10 |
| Complete full documentation | 25 (bonus) |

---

# Simple Services & Packages Schema

Run these SQL commands to enable the simplified service menu.

## 32. Create `services` table (hourly rate based)

Services use hourly rates. Price is calculated at quote time: aircraft_hours × hourly_rate.

```sql
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  service_type VARCHAR(50) DEFAULT 'exterior',
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_detailer ON services(detailer_id);
```

Service types map to aircraft hour fields:
- `exterior` → aircraft.exterior_hours
- `interior` → aircraft.interior_hours
- `brightwork` → aircraft.exterior_hours
- `coating` → aircraft.exterior_hours

## 33. Create `packages` table (bundles of services)

```sql
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) DEFAULT 0,
  service_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_packages_detailer ON packages(detailer_id);
```

## Service vs Package

| Type | Description |
|------|-------------|
| Service | Individual service with hourly rate (e.g., "Ceramic Coating" - $175/hr). Price = aircraft_hours × hourly_rate |
| Package | Bundle of services at a fixed package price (e.g., "Gold Package" = $2,500 flat) |

Packages reference services by their IDs in the `service_ids` array. The package price is a fixed amount, typically less than the sum of individual service prices to offer a discount.

## 34. Add columns to `quotes` table for new services system

```sql
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS selected_services UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_package_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_package_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS package_savings DECIMAL(10,2) DEFAULT 0;
```
