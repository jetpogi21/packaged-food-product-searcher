import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const DEMO_USER_EMAIL = "demo@pantry-index.local";
const MAX_RECENT_SEARCHES = 5;

export type RecentSearch = { query: string; searchedAt: string };

interface SearchHistoryStore {
  record(query: string): Promise<void>;
  recent(): Promise<RecentSearch[]>;
}

class MemorySearchHistoryStore implements SearchHistoryStore {
  private searches: RecentSearch[] = [];

  async record(query: string) {
    this.searches = [{ query, searchedAt: new Date().toISOString() }, ...this.searches.filter((search) => search.query.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, MAX_RECENT_SEARCHES);
  }

  async recent() { return this.searches; }
}

class PrismaSearchHistoryStore implements SearchHistoryStore {
  constructor(private readonly prisma: PrismaClient) {}

  async record(query: string) {
    const user = await this.prisma.user.upsert({
      where: { email: DEMO_USER_EMAIL },
      update: {},
      create: { email: DEMO_USER_EMAIL }
    });

    await this.prisma.searchHistory.create({ data: { query, userId: user.id } });
  }

  async recent(): Promise<RecentSearch[]> {
    const user = await this.prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { searches: { orderBy: { createdAt: "desc" }, take: 25, select: { query: true, createdAt: true } } }
    });

    const seen = new Set<string>();
    return (user?.searches ?? []).filter((search) => {
      const key = search.query.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_RECENT_SEARCHES).map((search) => ({ query: search.query, searchedAt: search.createdAt.toISOString() }));
  }
}

let store: SearchHistoryStore | undefined;

export function searchHistoryStore(): SearchHistoryStore {
  if (store) return store;
  store = process.env.SEARCH_HISTORY_STORE === "memory" ? new MemorySearchHistoryStore() : new PrismaSearchHistoryStore(createPrismaClient());
  return store;
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required when SEARCH_HISTORY_STORE is not set to memory.");

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
