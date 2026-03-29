import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, cashbooksTable, transactionsTable, insertCashbookSchema } from "./_db";
import { asc, eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET /api/cashbooks — list all with balances
  if (req.method === "GET") {
    try {
      const cashbooks = await db
        .select()
        .from(cashbooksTable)
        .orderBy(asc(cashbooksTable.createdAt));

      const result = await Promise.all(
        cashbooks.map(async (cb) => {
          const txs = await db
            .select()
            .from(transactionsTable)
            .where(eq(transactionsTable.cashbookId, cb.id));
          let totalCashIn = 0;
          let totalCashOut = 0;
          for (const tx of txs) {
            if (tx.type === "cash_in") totalCashIn += parseFloat(tx.amount);
            else totalCashOut += parseFloat(tx.amount);
          }
          return { ...cb, totalBalance: totalCashIn - totalCashOut, totalCashIn, totalCashOut };
        })
      );

      return res.status(200).json(result);
    } catch (err) {
      console.error("Failed to list cashbooks", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // POST /api/cashbooks — create new
  if (req.method === "POST") {
    try {
      const parsed = insertCashbookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const [cashbook] = await db
        .insert(cashbooksTable)
        .values({ name: parsed.data.name, description: parsed.data.description ?? null })
        .returning();

      return res.status(201).json({ ...cashbook, totalBalance: 0, totalCashIn: 0, totalCashOut: 0 });
    } catch (err) {
      console.error("Failed to create cashbook", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
