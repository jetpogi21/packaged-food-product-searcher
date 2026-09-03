import Stripe from "stripe";

export class PaymentConfigurationError extends Error {}

export type CheckoutLocale = "en" | "nl" | "de" | "fr";

export function checkoutInputFromUser(user: { id: string; email: string }, locale: CheckoutLocale) {
  return { userId: user.id, email: user.email, locale };
}

export async function createCheckoutSession(input: { userId: string; email: string; locale: CheckoutLocale }) {
  if (process.env.PAYMENTS_PROVIDER === "mock") {
    return { url: `${requiredEnvironment("APP_URL")}/?checkout=pending`, locale: input.locale };
  }

  const stripe = new Stripe(requiredEnvironment("STRIPE_SECRET_KEY"));
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: input.userId,
    customer_email: input.email,
    line_items: [{ price: requiredEnvironment("STRIPE_PRICE_ID"), quantity: 1 }],
    locale: input.locale,
    subscription_data: { metadata: { demoUserId: input.userId } },
    success_url: `${requiredEnvironment("APP_URL")}/?checkout=pending`,
    cancel_url: `${requiredEnvironment("APP_URL")}/?checkout=cancelled`
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  return { url: session.url };
}

export async function retrieveSubscriptionEntitlement(subscriptionId: string) {
  if (process.env.PAYMENTS_PROVIDER === "mock") {
    return { stripeSubscriptionId: subscriptionId, stripeCustomerId: "cus_mock_checkout", status: "active", currentPeriodEnd: null };
  }

  const stripe = new Stripe(requiredEnvironment("STRIPE_SECRET_KEY"));
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as {
    id: string;
    customer: string | { id: string };
    status: string;
    current_period_end?: number | null;
  };

  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
  };
}

export function constructWebhookEvent(rawBody: Buffer, signature: string | undefined) {
  if (!signature) throw new Error("Stripe signature is required.");
  const webhookSecret = requiredEnvironment("STRIPE_WEBHOOK_SECRET");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_local_webhook_verifier");
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new PaymentConfigurationError(`${name} is not configured.`);
  return value;
}
