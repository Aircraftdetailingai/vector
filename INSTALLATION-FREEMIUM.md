# Vector Freemium System Installation

## Overview

This freemium system adds:
- **Tiered pricing**: Free, Starter ($29.95), Pro ($49.95), Business ($79.95)
- **Quote limits**: 5/25/100/unlimited quotes per month
- **Platform fees**: 5%/3%/2%/1% of revenue by tier
- **Smart upgrade prompts**: AI-style cost-benefit analysis

## Installation Steps

### 1. Run Database Migration

Go to Supabase Dashboard > SQL Editor and run:

```sql
-- Copy contents of database/migration-freemium.sql
```

### 2. Add Environment Variables

Add to your `.env.local` (and Vercel environment variables):

```bash
# Stripe subscription price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_STARTER=price_xxxxx  # $29.95/month recurring
STRIPE_PRICE_PRO=price_xxxxx      # $49.95/month recurring
STRIPE_PRICE_BUSINESS=price_xxxxx # $79.95/month recurring
```

### 3. Create Stripe Products

In Stripe Dashboard > Products:

1. **Starter Plan** - $29.95/month
   - Create product "Vector Starter"
   - Add recurring price: $29.95/month
   - Copy price ID to `STRIPE_PRICE_STARTER`

2. **Pro Plan** - $49.95/month
   - Create product "Vector Pro"
   - Add recurring price: $49.95/month
   - Copy price ID to `STRIPE_PRICE_PRO`

3. **Business Plan** - $79.95/month
   - Create product "Vector Business"
   - Add recurring price: $79.95/month
   - Copy price ID to `STRIPE_PRICE_BUSINESS`

### 4. Update Stripe Webhook

In Stripe Dashboard > Webhooks, add these events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### 5. Integrate Quote Form

Wrap your quote form with the limit checker:

```jsx
import QuoteFormWithLimits, { useQuoteLimits } from '@/components/QuoteFormWithLimits';

// Option 1: Wrapper component
export default function Dashboard() {
  return (
    <QuoteFormWithLimits>
      {({ canCreateQuote, checkQuoteLimit, onQuoteCreated }) => (
        <YourQuoteForm
          onSubmit={() => {
            if (checkQuoteLimit()) {
              // Create quote...
              onQuoteCreated();
            }
          }}
          disabled={!canCreateQuote}
        />
      )}
    </QuoteFormWithLimits>
  );
}

// Option 2: Hook directly
function YourComponent() {
  const { canCreateQuote, checkQuoteLimit, showUpgradeModal, setShowUpgradeModal } = useQuoteLimits();

  const handleCreateQuote = () => {
    if (!checkQuoteLimit()) return; // Shows modal if limit reached
    // Create quote...
  };
}
```

### 6. Add Usage Display (Optional)

Show usage in header or sidebar:

```jsx
import { UsageDisplay } from '@/components/QuoteFormWithLimits';

<UsageDisplay className="mt-4" />
```

### 7. Add Upgrade Button (Optional)

Add upgrade option in settings or header:

```jsx
import UpgradeModal from '@/components/UpgradeModal';

const [showUpgrade, setShowUpgrade] = useState(false);

<button onClick={() => setShowUpgrade(true)}>
  Upgrade Plan
</button>
<UpgradeModal
  isOpen={showUpgrade}
  onClose={() => setShowUpgrade(false)}
  detailerId={user.id}
/>
```

## File Structure

```
lib/
├── pricing-tiers.js     # Tier config, fee calculations
└── usage-tracking.js    # Usage stats, analysis functions

components/
├── UpgradeModal.jsx     # AI cost-benefit upgrade popup
└── QuoteFormWithLimits.jsx # Hook and wrapper for forms

app/api/
├── usage/route.js       # GET current usage stats
├── usage/analysis/route.js # GET upgrade analysis
├── upgrade/route.js     # POST start checkout
└── webhooks/stripe/route.js # Subscription handlers (updated)

database/
└── migration-freemium.sql
```

## API Endpoints

### GET /api/usage
Returns current user's usage stats:
```json
{
  "tier": "free",
  "quotesThisMonth": 3,
  "quotesLimit": 5,
  "quotesRemaining": 2,
  "revenueThisMonth": 1250.00,
  "feesThisMonth": 62.50,
  "feeRate": 0.05,
  "avgMonthlyRevenue": 2000.00
}
```

### GET /api/usage/analysis
Returns upgrade recommendation:
```json
{
  "currentTier": "free",
  "nextTier": "starter",
  "recommendation": "strong",
  "urgency": "medium",
  "message": "Based on your revenue, upgrading would save you $25/month!",
  "savings": {
    "netMonthlySavings": 25.00,
    "breakevenRevenue": 1500
  }
}
```

### POST /api/upgrade
Start checkout for tier upgrade:
```json
{ "tier": "starter" }
```
Returns Stripe Checkout URL.

## Tier Configuration

| Tier | Price | Quotes | Platform Fee |
|------|-------|--------|--------------|
| Free | $0 | 5/mo | 5% |
| Starter | $29.95 | 25/mo | 3% |
| Pro | $49.95 | 100/mo | 2% |
| Business | $79.95 | Unlimited | 1% |

## Testing

1. Create test user on free tier
2. Create 5 quotes to hit limit
3. Verify upgrade modal appears
4. Test Stripe checkout flow
5. Verify tier updates after payment
