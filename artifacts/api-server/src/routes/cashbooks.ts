import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cashbooksTable, transactionsTable, insertCashbookSchema, insertTransactionSchema } from "@workspace/db";
import { eq, and, ilike, asc, desc, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/cashbooks", async (req, res) => {
  try {
    const cashbooks = await db.select().from(cashbooksTable).orderBy(asc(cashbooksTable.createdAt));

    const result = await Promise.all(
      cashbooks.map(async (cb) => {
        const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.cashbookId, cb.id));
        let totalCashIn = 0;
        let totalCashOut = 0;
        for (const tx of txs) {
          if (tx.type === "cash_in") totalCashIn += parseFloat(tx.amount);
          else totalCashOut += parseFloat(tx.amount);
        }
        return {
          ...cb,
          totalBalance: totalCashIn - totalCashOut,
          totalCashIn,
          totalCashOut,
        };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list cashbooks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cashbooks", async (req, res) => {
  try {
    const parsed = insertCashbookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const [cashbook] = await db
      .insert(cashbooksTable)
      .values({ name: parsed.data.name, description: parsed.data.description ?? null })
      .returning();

    res.status(201).json({
      ...cashbook,
      totalBalance: 0,
      totalCashIn: 0,
      totalCashOut: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create cashbook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cashbooks/:cashbookId", async (req, res) => {
  try {
    const cashbookId = parseInt(req.params.cashbookId);
    if (isNaN(cashbookId)) {
      res.status(400).json({ error: "Invalid cashbook ID" });
      return;
    }

    const [cashbook] = await db.select().from(cashbooksTable).where(eq(cashbooksTable.id, cashbookId));
    if (!cashbook) {
      res.status(404).json({ error: "Cashbook not found" });
      return;
    }

    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.cashbookId, cashbookId));
    let totalCashIn = 0;
    let totalCashOut = 0;
    for (const tx of txs) {
      if (tx.type === "cash_in") totalCashIn += parseFloat(tx.amount);
      else totalCashOut += parseFloat(tx.amount);
    }

    res.json({ ...cashbook, totalBalance: totalCashIn - totalCashOut, totalCashIn, totalCashOut });
  } catch (err) {
    req.log.error({ err }, "Failed to get cashbook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cashbooks/:cashbookId", async (req, res) => {
  try {
    const cashbookId = parseInt(req.params.cashbookId);
    if (isNaN(cashbookId)) {
      res.status(400).json({ error: "Invalid cashbook ID" });
      return;
    }

    const parsed = insertCashbookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const [updated] = await db
      .update(cashbooksTable)
      .set({ name: parsed.data.name, description: parsed.data.description ?? null, updatedAt: new Date() })
      .where(eq(cashbooksTable.id, cashbookId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Cashbook not found" });
      return;
    }

    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.cashbookId, cashbookId));
    let totalCashIn = 0;
    let totalCashOut = 0;
    for (const tx of txs) {
      if (tx.type === "cash_in") totalCashIn += parseFloat(tx.amount);
      else totalCashOut += parseFloat(tx.amount);
    }

    res.json({ ...updated, totalBalance: totalCashIn - totalCashOut, totalCashIn, totalCashOut });
  } catch (err) {
    req.log.error({ err }, "Failed to update cashbook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cashbooks/:cashbookId", async (req, res) => {
  try {
    const cashbookId = parseInt(req.params.cashbookId);
    if (isNaN(cashbookId)) {
      res.status(400).json({ error: "Invalid cashbook ID" });
      return;
    }

    await db.delete(cashbooksTable).where(eq(cashbooksTable.id, cashbookId));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete cashbook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cashbooks/:cashbookId/transactions", async (req, res) => {
  try {
    const cashbookId = parseInt(req.params.cashbookId);
    if (isNaN(cashbookId)) {
      res.status(400).json({ error: "Invalid cashbook ID" });
      return;
    }

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

    res.json({ transactions, totalBalance: totalCashIn - totalCashOut, totalCashIn, totalCashOut });
  } catch (err) {
    req.log.error({ err }, "Failed to list transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cashbooks/:cashbookId/transactions", async (req, res) => {
  try {
    const cashbookId = parseInt(req.params.cashbookId);
    if (isNaN(cashbookId)) {
      res.status(400).json({ error: "Invalid cashbook ID" });
      return;
    }

    const bodySchema = z.object({
      type: z.enum(["cash_in", "cash_out"]),
      amount: z.number().positive(),
      particular: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
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

    res.status(201).json({ ...tx, amount: parseFloat(tx.amount) });
  } catch (err) {
    req.log.error({ err }, "Failed to create transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cashbooks/:cashbookId/transactions/:transactionId", async (req, res) => {
  try {
    const cashbookId = parseInt(req.params.cashbookId);
    const transactionId = parseInt(req.params.transactionId);
    if (isNaN(cashbookId) || isNaN(transactionId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    await db
      .delete(transactionsTable)
      .where(and(eq(transactionsTable.id, transactionId), eq(transactionsTable.cashbookId, cashbookId)));

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
