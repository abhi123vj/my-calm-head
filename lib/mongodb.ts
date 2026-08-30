import "server-only";
import { MongoClient, type Db } from "mongodb";
import { serverEnv } from "@/lib/env";

/**
 * A single MongoClient is shared across the whole server process. The client
 * maintains its own connection pool, so creating one per request would exhaust
 * connections. It is stashed on globalThis so that hot reloads in development
 * reuse the existing pool instead of leaking a new one on every edit.
 */
const globalForMongo = globalThis as typeof globalThis & {
  __migraineMongoClient?: Promise<MongoClient>;
};

function connect(): Promise<MongoClient> {
  const { MONGODB_URI } = serverEnv();
  const client = new MongoClient(MONGODB_URI, { appName: "my-calm-head" });
  const connecting = client.connect();

  // Never cache a failed connection: clear it so the next call retries.
  connecting.catch(() => {
    globalForMongo.__migraineMongoClient = undefined;
  });

  return connecting;
}

export function getMongoClient(): Promise<MongoClient> {
  globalForMongo.__migraineMongoClient ??= connect();
  return globalForMongo.__migraineMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(serverEnv().MONGODB_DATABASE);
}
