import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, cashbooksTable, transactionsTable, insertCashbookSchema } from "../_db";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cashbookId = parseInt(req.query.cashbookId as string);
  if (isNaN(cashbookId)) {
    return res.status(400).json({ error: "Invalid cashbook ID" });
  }

  // Helper: compute balances for a cashbook
  async function getBalances(id: number) {
    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.cashbookId, id));
    let totalCashIn = 0;
    let totalCashOut = 0;
    for (const tx of txs) {
      if (tx.type === "cash_in") totalCashIn += parseFloat(tx.amount);
      else totalCashOut += parseFloat(tx.amount);
    }
    return { totalBalance: totalCashIn - totalCashOut, totalCashIn, totalCashOut };
  }

  // GET /api/cashbooks/:cashbookId
  if (req.method === "GET") {
    try {
      const [cashbook] = await db.select().from(cashbooksTable).where(eq(cashbooksTable.id, cashbookId));
      if (!cashbook) return res.status(404).json({ error: "Cashbook not found" });
      const balances = await getBalances(cashbookId);
      return res.status(200).json({ ...cashbook, ...balances });
    } catch (err) {
      console.error("Failed to get cashbook", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PUT /api/cashbooks/:cashbookId
  if (req.method === "PUT") {
    try {
      const parsed = insertCashbookSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

      const [updated] = await db
        .update(cashbooksTable)
        .set({ name: parsed.data.name, description: parsed.data.description ?? null, updatedAt: new Date() })
        .where(eq(cashbooksTable.id, cashbookId))
        .returning();

      if (!updated) return res.status(404).json({ error: "Cashbook not found" });
      const balances = await getBalances(cashbookId);
      return res.status(200).json({ ...updated, ...balances });
    } catch (err) {
      console.error("Failed to update cashbook", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // DELETE /api/cashbooks/:cashbookId
  if (req.method === "DELETE") {
    try {
      await db.delete(cashbooksTable).where(eq(cashbooksTable.id, cashbookId));
      return res.status(204).end();
    } catch (err) {
      console.error("Failed to delete cashbook", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
