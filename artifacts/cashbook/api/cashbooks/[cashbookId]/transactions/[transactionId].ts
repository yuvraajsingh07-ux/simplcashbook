import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, transactionsTable } from "../../../_db";
import { and, eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cashbookId = parseInt(req.query.cashbookId as string);
  const transactionId = parseInt(req.query.transactionId as string);

  if (isNaN(cashbookId) || isNaN(transactionId)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  // DELETE /api/cashbooks/:cashbookId/transactions/:transactionId
  if (req.method === "DELETE") {
    try {
      await db
        .delete(transactionsTable)
        .where(
          and(
            eq(transactionsTable.id, transactionId),
            eq(transactionsTable.cashbookId, cashbookId)
          )
        );

      return res.status(204).end();
    } catch (err) {
      console.error("Failed to delete transaction", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
