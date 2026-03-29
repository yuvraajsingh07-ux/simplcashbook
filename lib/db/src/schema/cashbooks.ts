import { pgTable, text, serial, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cashbooksTable = pgTable("cashbooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCashbookSchema = createInsertSchema(cashbooksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCashbook = z.infer<typeof insertCashbookSchema>;
export type Cashbook = typeof cashbooksTable.$inferSelect;

export const transactionTypeEnum = pgEnum("transaction_type", ["cash_in", "cash_out"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  cashbookId: serial("cashbook_id").references(() => cashbooksTable.id, { onDelete: "cascade" }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  particular: text("particular").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
