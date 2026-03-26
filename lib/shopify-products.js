// Shopify product URLs for subscription plans
export const SHOPIFY_PLANS = {
  pro: 'https://shinyjets.com/products/shiny-jets-crm-pro',
  business: 'https://shinyjets.com/products/shiny-jets-crm-business',
  enterprise: 'https://shinyjets.com/products/shiny-jets-crm-enterprise',
};

// Build Shopify checkout URL with customer email pre-filled
export function getShopifyUpgradeUrl(plan, email) {
  const base = SHOPIFY_PLANS[plan];
  if (!base) return null;
  const url = new URL(base);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

// Manage subscription URL
export const SHOPIFY_MANAGE_URL = 'https://shinyjets.com/account/subscriptions';
