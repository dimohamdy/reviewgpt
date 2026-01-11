import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on initialization
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Create Drizzle instance
export const db = drizzle({ client: pool, schema });

// Export pool for direct SQL queries if needed
export { pool };

// Helper function to test connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connection established");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:", error);
    return false;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
