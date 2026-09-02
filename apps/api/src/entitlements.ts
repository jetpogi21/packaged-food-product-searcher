import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

export const DEMO_USER_EMAIL = "demo@pantry-index.local";

export type Entitlement = {
  status: string;
  active: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
};

type DemoUser = { id: string; email: string };
type SubscriptionUpdate = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
};

interface EntitlementStore {
  demoUser(): Promise<DemoUser>;
  get(): Promise<Entitlement>;
  linkCheckout(userId: string, stripeCustomerId: string | null, stripeSubscriptionId: string | null): Promise<void>;
  updateSubscription(update: SubscriptionUpdate): Promise<void>;
  recordWebhookEvent(eventId: string, eventType: string): Promise<boolean>;
}

class MemoryEntitlementStore implements EntitlementStore {
  private entitlement: Entitlement = { status: "inactive", active: false, stripeCustomerId: null, stripeSubscriptionId: null, currentPeriodEnd: null };
  private readonly eventIds = new Set<string>();

  async demoUser() { return { id: "demo-user", email: DEMO_USER_EMAIL }; }
  async get() { return this.entitlement; }

  async linkCheckout(_userId: string, stripeCustomerId: string | null, stripeSubscriptionId: string | null) {
    this.entitlement = { ...this.entitlement, status: this.entitlement.status === "inactive" ? "pending" : this.entitlement.status, stripeCustomerId, stripeSubscriptionId };
  }

  async updateSubscription(update: SubscriptionUpdate) {
    this.entitlement = {
      status: update.status,
      active: isActiveStatus(update.status),
      stripeCustomerId: update.stripeCustomerId,
      stripeSubscriptionId: update.stripeSubscriptionId,
      currentPeriodEnd: update.currentPeriodEnd?.toISOString() ?? null
    };
  }

  async recordWebhookEvent(eventId: string) {
    if (this.eventIds.has(eventId)) return false;
    this.eventIds.add(eventId);
    return true;
  }
}

class PrismaEntitlementStore implements EntitlementStore {
  constructor(private readonly prisma: PrismaClient) {}

  async demoUser(): Promise<DemoUser> {
    return this.prisma.user.upsert({ where: { email: DEMO_USER_EMAIL }, update: {}, create: { email: DEMO_USER_EMAIL }, select: { id: true, email: true } });
  }

  async get(): Promise<Entitlement> {
    const user = await this.demoUser();
    const entitlement = await this.prisma.subscriptionEntitlement.findUnique({ where: { userId: user.id } });
    if (!entitlement) return { status: "inactive", active: false, stripeCustomerId: null, stripeSubscriptionId: null, currentPeriodEnd: null };
    return {
      status: entitlement.status,
      active: isActiveStatus(entitlement.status),
      stripeCustomerId: entitlement.stripeCustomerId,
      stripeSubscriptionId: entitlement.stripeSubscriptionId,
      currentPeriodEnd: entitlement.currentPeriodEnd?.toISOString() ?? null
    };
  }

  async linkCheckout(userId: string, stripeCustomerId: string | null, stripeSubscriptionId: string | null) {
    const current = await this.prisma.subscriptionEntitlement.findUnique({ where: { userId } });
    if (current) {
      await this.prisma.subscriptionEntitlement.update({ where: { userId }, data: { stripeCustomerId: stripeCustomerId ?? current.stripeCustomerId, stripeSubscriptionId: stripeSubscriptionId ?? current.stripeSubscriptionId } });
      return;
    }
    await this.prisma.subscriptionEntitlement.create({ data: { userId, stripeCustomerId, stripeSubscriptionId, status: "pending" } });
  }

  async updateSubscription(update: SubscriptionUpdate) {
    await this.prisma.subscriptionEntitlement.upsert({
      where: { userId: update.userId },
      update: { stripeCustomerId: update.stripeCustomerId, stripeSubscriptionId: update.stripeSubscriptionId, status: update.status, currentPeriodEnd: update.currentPeriodEnd },
      create: update
    });
  }

  async recordWebhookEvent(eventId: string, eventType: string) {
    try {
      await this.prisma.stripeWebhookEvent.create({ data: { id: eventId, eventType } });
      return true;
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") return false;
      throw error;
    }
  }
}

let store: EntitlementStore | undefined;

export function entitlementStore(): EntitlementStore {
  if (store) return store;
  store = process.env.PAYMENTS_STORE === "memory" ? new MemoryEntitlementStore() : new PrismaEntitlementStore(createPrismaClient());
  return store;
}

export function isActiveStatus(status: string) {
  return status === "active" || status === "trialing";
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required when PAYMENTS_STORE is not set to memory.");
  const url = new URL(databaseUrl);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 5
    })
  });
}
