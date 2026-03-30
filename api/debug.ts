import type { VercelRequest, VercelResponse } from "@vercel/node";

// Step 1: Just check if the function can run at all
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: Record<string, unknown> = {
    step: "basic",
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 40) + "...",
    nodeVersion: process.version,
  };

  // Step 2: Try importing the db module
  try {
    const { db } = await import("../artifacts/cashbook/api/_db");
    results.dbLoaded = !!db;
    results.step = "db-loaded";
  } catch (err: unknown) {
    results.dbError = err instanceof Error ? err.message : String(err);
    results.dbStack = err instanceof Error ? err.stack?.split("\n").slice(0, 5).join(" | ") : undefined;
    return res.status(200).json(results);
  }

  // Step 3: Try a simple query
  try {
    const { db, cashbooksTable } = await import("../artifacts/cashbook/api/_db");
    const rows = await db.select().from(cashbooksTable).limit(1);
    results.queryOk = true;
    results.rowCount = rows.length;
    results.step = "query-ok";
  } catch (err: unknown) {
    results.queryError = err instanceof Error ? err.message : String(err);
  }

  return res.status(200).json(results);
}
