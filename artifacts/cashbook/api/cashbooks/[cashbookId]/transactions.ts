import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, transactionsTable } from "../../_db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cashbookId = parseInt(req.query.cashbookId as string);
  if (isNaN(cashbookId)) {
    return res.status(400).json({ error: "Invalid cashbook ID" });
  }

  // GET /api/cashbooks/:cashbookId/transactions
  if (req.method === "GET") {
    try {
      const search = req.query.search as string | undefined;

      let txs = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.cashbookId, cashbookId))
        .orderBy(asc(transactionsTable.date), asc(transactionsTable.createdAt));

      if (search && search.trim()) {
        const lower = search.toLowerCase();
        txs = txs.filter((t) => t.particular.toLowerCase().includes(lower));
      }

      let runningBalance = 0;
      let totalCashIn = 0;
      let totalCashOut = 0;

      const transactions = txs.map((tx) => {
        const amount = parseFloat(tx.amount);
        if (tx.type === "cash_in") {
          runningBalance += amount;
          totalCashIn += amount;
        } else {
          runningBalance -= amount;
          totalCashOut += amount;
        }
        return { ...tx, amount, runningBalance };
      });

      return res.status(200).json({
        transactions,
        totalBalance: totalCashIn - totalCashOut,
        totalCashIn,
        totalCashOut,
      });
    } catch (err) {
      console.error("Failed to list transactions", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // POST /api/cashbooks/:cashbookId/transactions
  if (req.method === "POST") {
    try {
      const bodySchema = z.object({
        type: z.enum(["cash_in", "cash_out"]),
        amount: z.number().positive(),
        particular: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const [tx] = await db
        .insert(transactionsTable)
        .values({
          cashbookId,
          type: parsed.data.type,
          amount: parsed.data.amount.toString(),
          particular: parsed.data.particular,
          date: parsed.data.date,
        })
        .returning();

      return res.status(201).json({ ...tx, amount: parseFloat(tx.amount) });
    } catch (err) {
      console.error("Failed to create transaction", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
