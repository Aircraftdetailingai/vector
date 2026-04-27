-- Track the Stripe PaymentIntent for the deposit slice separately from the
-- final/balance payment intent. Without this, the second checkout session
-- (balance) would overwrite stripe_payment_intent_id and we'd lose the
-- ability to reconcile, refund, or audit the deposit charge independently.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_payment_intent_id text;
