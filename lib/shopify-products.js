// Shopify product URLs for subscription plans
export const SHOPIFY_PLANS = {
  pro: 'https://shinyjets.com/products/shiny-jets-crm-pro-aircraft-detailing-business-software',
  business: 'https://shinyjets.com/products/shiny-jets-crm-business-team-aircraft-detailing-software',
  enterprise: 'https://shinyjets.com/products/shiny-jets-crm-enterprise-white-label-aircraft-detailing-platform',
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
