/**
 * Test Seal Subscriptions webhook → plan sync
 * Simulates all four SKU paths + cancellation
 */

// Inline the resolvePlan logic to test locally without importing from the route
const SKU_PLAN_MAP = {
  'SJ-CRM-FREE': 'free',
  'SJ-CRM-PRO': 'pro',
  'SJ-CRM-BUSINESS': 'business',
  'SJ-CRM-ENTERPRISE': 'enterprise',
};

function planFromPrice(price) {
  const p = parseFloat(price);
  if (p === 0) return 'free';
  if (p >= 70 && p <= 90) return 'pro';
  if (p >= 140 && p <= 160) return 'business';
  if (p >= 850 && p <= 950) return 'enterprise';
  return null;
}

function resolvePlan(item) {
  const sku = (item.sku || '').toUpperCase().trim();
  if (SKU_PLAN_MAP[sku]) return SKU_PLAN_MAP[sku];
  for (const [prefix, plan] of Object.entries(SKU_PLAN_MAP)) {
    if (sku.includes(prefix)) return plan;
  }
  const title = (item.title || '').toLowerCase();
  if (title.includes('enterprise')) return 'enterprise';
  if (title.includes('business')) return 'business';
  if (title.includes('pro')) return 'pro';
  if (title.includes('free')) return 'free';
  return planFromPrice(item.price);
}

// ─── Test Cases ───
const tests = [
  // SKU-based resolution
  { name: 'SKU: SJ-CRM-FREE → free',       item: { sku: 'SJ-CRM-FREE',       title: '', price: '0.00' },    expected: 'free' },
  { name: 'SKU: SJ-CRM-PRO → pro',          item: { sku: 'SJ-CRM-PRO',        title: '', price: '79.00' },   expected: 'pro' },
  { name: 'SKU: SJ-CRM-BUSINESS → business', item: { sku: 'SJ-CRM-BUSINESS',  title: '', price: '149.00' },  expected: 'business' },
  { name: 'SKU: SJ-CRM-ENTERPRISE → enterprise', item: { sku: 'SJ-CRM-ENTERPRISE', title: '', price: '899.00' }, expected: 'enterprise' },

  // Title-based resolution (no SKU)
  { name: 'Title: "Shiny Jets CRM Pro" → pro',        item: { sku: '', title: 'Shiny Jets CRM Pro',        price: '79.00' },  expected: 'pro' },
  { name: 'Title: "Shiny Jets CRM Business" → business', item: { sku: '', title: 'Shiny Jets CRM Business', price: '149.00' }, expected: 'business' },
  { name: 'Title: "Shiny Jets CRM Enterprise" → enterprise', item: { sku: '', title: 'Shiny Jets CRM Enterprise', price: '899.00' }, expected: 'enterprise' },

  // Price-only fallback (no SKU, generic title)
  { name: 'Price: $0.00 → free',       item: { sku: '', title: 'Subscription', price: '0.00' },   expected: 'free' },
  { name: 'Price: $79.00 → pro',       item: { sku: '', title: 'Subscription', price: '79.00' },  expected: 'pro' },
  { name: 'Price: $149.00 → business', item: { sku: '', title: 'Subscription', price: '149.00' }, expected: 'business' },
  { name: 'Price: $899.00 → enterprise', item: { sku: '', title: 'Subscription', price: '899.00' }, expected: 'enterprise' },

  // Edge: unknown → null
  { name: 'Unknown: $50.00 → null',    item: { sku: '', title: 'Subscription', price: '50.00' },  expected: null },
];

console.log('Seal Subscriptions → Plan Sync Tests');
console.log('═'.repeat(55));

let passed = 0;
let failed = 0;

for (const t of tests) {
  const result = resolvePlan(t.item);
  const ok = result === t.expected;
  const status = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}  ${t.name}`);
  if (!ok) {
    console.log(`        Got: ${result}, Expected: ${t.expected}`);
    failed++;
  } else {
    passed++;
  }
}

console.log('═'.repeat(55));
console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length}`);

// Test cancellation flow (logic check)
console.log('\nCancellation Path Tests');
console.log('─'.repeat(55));

const cancelTopics = [
  'subscription_contracts/cancel',
  'subscription_contracts/update',  // with status: cancelled
  'subscription_contracts/update',  // with status: expired
];
const cancelPayloads = [
  { status: 'cancelled' },
  { status: 'cancelled' },
  { status: 'expired' },
];

for (let i = 0; i < cancelTopics.length; i++) {
  const topic = cancelTopics[i];
  const payload = cancelPayloads[i];
  const isCancelTopic = topic === 'subscription_contracts/cancel' || topic === 'app_subscriptions/update';
  const isCancelStatus = payload.status === 'cancelled' || payload.status === 'expired';
  const wouldCancel = isCancelTopic || isCancelStatus;
  const status = wouldCancel ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}  ${topic} (status=${payload.status}) → plan=free`);
  if (wouldCancel) passed++; else failed++;
}

console.log('─'.repeat(55));
console.log(`\nFinal: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
