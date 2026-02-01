import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const COMMISSION_RATES = {
  basic: 0.10,
  pro: 0.25,
  partner: 0.60,
};

// POST - Create checkout session for cart
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim());
    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { items } = await request.json();
    // items: [{ productId, quantity }]

    if (!items || !items.length) {
      return Response.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Get products with vendor info
    const productIds = items.map(i => i.productId);
    const { data: products, error: prodError } = await supabase
      .from('vendor_products')
      .select(`
        *,
        vendors (id, company_name, commission_tier)
      `)
      .in('id', productIds)
      .eq('status', 'active');

    if (prodError || !products?.length) {
      return Response.json({ error: 'Products not found' }, { status: 404 });
    }

    // Build line items for Stripe
    const lineItems = [];
    const orderItems = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      const quantity = parseInt(item.quantity) || 1;
      const priceInCents = Math.round(product.price * 100);

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: `By ${product.vendors?.company_name || 'Vendor'}`,
            images: product.images?.length ? [product.images[0]] : [],
          },
          unit_amount: priceInCents,
        },
        quantity,
      });

      const commissionRate = COMMISSION_RATES[product.vendors?.commission_tier] || 0.10;
      const itemTotal = product.price * quantity;
      const commission = itemTotal * commissionRate;
      const vendorAmount = itemTotal - commission;

      orderItems.push({
        product_id: product.id,
        vendor_id: product.vendor_id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        total: itemTotal,
        commission,
        vendor_amount: vendorAmount,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aircraftdetailing.ai'}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aircraftdetailing.ai'}/shop/cart`,
      metadata: {
        detailer_id: user.id,
        order_items: JSON.stringify(orderItems.map(i => ({
          product_id: i.product_id,
          vendor_id: i.vendor_id,
          quantity: i.quantity,
        }))),
      },
    });

    // Store pending order
    const orderTotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert({
        detailer_id: user.id,
        stripe_session_id: session.id,
        items: orderItems,
        total: orderTotal,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
    }

    return Response.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (err) {
    console.error('Checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
