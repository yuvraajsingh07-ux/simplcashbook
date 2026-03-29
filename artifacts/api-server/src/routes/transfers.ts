import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, cashbooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const transferSchema = z.object({
  fromCashbookId: z.number().int().positive(),
  toCashbookId: z.number().int().positive(),
  amount: z.number().positive(),
  particular: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.post("/transfers", async (req, res) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const { fromCashbookId, toCashbookId, amount, particular, date } = parsed.data;

    if (fromCashbookId === toCashbookId) {
      res.status(400).json({ error: "Source and destination cashbooks must be different" });
      return;
    }

    // Verify both cashbooks exist
    const [fromCb] = await db.select().from(cashbooksTable).where(eq(cashbooksTable.id, fromCashbookId));
    const [toCb] = await db.select().from(cashbooksTable).where(eq(cashbooksTable.id, toCashbookId));

    if (!fromCb) {
      res.status(404).json({ error: "Source cashbook not found" });
      return;
    }
    if (!toCb) {
      res.status(404).json({ error: "Destination cashbook not found" });
      return;
    }

    const transferNote = particular;

    // Create debit in source cashbook and credit in destination cashbook
    const [sourceTx, destinationTx] = await db.transaction(async (trx) => {
      const [src] = await trx
        .insert(transactionsTable)
        .values({
          cashbookId: fromCashbookId,
          type: "cash_out",
          amount: amount.toString(),
          particular: `Transfer to ${toCb.name}: ${transferNote}`,
          date,
        })
        .returning();

      const [dst] = await trx
        .insert(transactionsTable)
        .values({
          cashbookId: toCashbookId,
          type: "cash_in",
          amount: amount.toString(),
          particular: `Transfer from ${fromCb.name}: ${transferNote}`,
          date,
        })
        .returning();

      return [src, dst];
    });

    res.status(201).json({
      sourceTransaction: { ...sourceTx, amount: parseFloat(sourceTx.amount) },
      destinationTransaction: { ...destinationTx, amount: parseFloat(destinationTx.amount) },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create transfer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
