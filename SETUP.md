# Shiny Jets CRM — Shopify Subscription Setup

## 1. Create Subscription Products in Shopify

In your Shopify admin (shinyjets.myshopify.com), create 3 products:

### Product 1: Shiny Jets CRM Pro
- **Title:** Shiny Jets CRM Pro
- **Price:** $79.00/month
- **SKU:** SJ-CRM-PRO
- **Description:** Unlimited quotes, full aircraft database, custom services, email notifications, remove branding, priority support, 2% platform fee
- **Product type:** Digital / Subscription

### Product 2: Shiny Jets CRM Business
- **Title:** Shiny Jets CRM Business
- **Price:** $149.00/month
- **SKU:** SJ-CRM-BUSINESS
- **Description:** Everything in Pro + team management, 1% platform fee
- **Product type:** Digital / Subscription

### Product 3: Shiny Jets CRM Enterprise
- **Title:** Shiny Jets CRM Enterprise
- **Price:** $299.00/month
- **SKU:** SJ-CRM-ENTERPRISE
- **Description:** Everything in Business + AI Sales Assistant, API access, 0% platform fee
- **Product type:** Digital / Subscription

## 2. Install a Subscription App

Shopify requires a subscription app to handle recurring billing. Choose one:

### Option A: Shopify Native Subscriptions (Recommended)
1. Go to **Settings > Payments > Manage subscriptions**
2. Enable Shopify Subscriptions
3. Configure each product with a monthly subscription selling plan

### Option B: Recharge Subscriptions
1. Install from the Shopify App Store
2. Configure subscription rules for each CRM product
3. Set billing frequency to monthly

## 3. Set Up Webhooks

In Shopify admin:
1. Go to **Settings > Notifications > Webhooks**
2. Add the following webhooks pointing to `https://crm.shinyjets.com/api/shopify/webhook`:

| Event | Webhook URL |
|-------|------------|
| **Order payment** (`orders/paid`) | `https://crm.shinyjets.com/api/shopify/webhook` |
| **Subscription update** (`subscription_contracts/update`) | `https://crm.shinyjets.com/api/shopify/webhook` |

3. Select **JSON** format for all webhooks
4. Copy the **Webhook signing secret** shown at the bottom of the webhooks page

## 4. Add Environment Variables to Vercel

In the Vercel dashboard for the `vector` project:
1. Go to **Settings > Environment Variables**
2. Add these variables for **Production** environment:

| Variable | Value |
|----------|-------|
| `SHOPIFY_WEBHOOK_SECRET` | *(paste the webhook signing secret from step 3)* |
| `SHOPIFY_STORE_URL` | `shinyjets.myshopify.com` |
| `NEXT_PUBLIC_APP_URL` | `https://crm.shinyjets.com` |

## 5. DNS Setup (GoDaddy)

Add the following DNS record in GoDaddy for `shinyjets.com`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **CNAME** | `crm` | `cname.vercel-dns.com` | 600 |

Then in Vercel dashboard:
1. Go to project **Settings > Domains**
2. Add `crm.shinyjets.com`
3. Keep `app.vectorav.ai` as an alias (do not remove)

## 6. How It Works

### New Customer Flow (no existing account)
1. Customer purchases a plan on shinyjets.com
2. Shopify sends `orders/paid` webhook to `/api/shopify/webhook`
3. Webhook creates a `beta_invite` record in the database
4. Customer receives "Your Shiny Jets CRM account is ready" email with signup link
5. Customer signs up and gets their plan activated immediately

### Existing Customer Flow
1. Customer purchases a plan on shinyjets.com using their existing email
2. Webhook finds their detailer account by email
3. Plan is upgraded automatically, `subscription_source` set to `shopify`

### Cancellation Flow
1. Customer cancels subscription in Shopify
2. Shopify sends `subscription_contracts/update` webhook
3. Webhook downgrades detailer to `free` plan
4. Customer receives cancellation confirmation email

## 7. Testing

1. Create a test order in Shopify with a test product matching one of the plan names
2. Verify the webhook fires by checking Vercel function logs
3. Confirm the detailer's plan is updated in Supabase
