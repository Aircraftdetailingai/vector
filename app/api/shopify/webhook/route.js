export const dynamic = 'force-dynamic';

// Canonical route is /api/webhooks/shopify — this forwards to it
export async function POST(request) {
  const { POST: handler } = await import('@/app/api/webhooks/shopify/route');
  return handler(request);
}
