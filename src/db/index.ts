import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://recruitment:recruitment@localhost:5432/recruitment",
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
