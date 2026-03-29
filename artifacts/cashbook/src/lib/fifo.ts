export type FIFOBill = {
  id: number;
  date: string;
  particular: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  daysOpen: number;
  status: "cleared" | "partially_paid" | "unpaid";
};

type Transaction = {
  id: number;
  type: string;
  amount: number;
  particular: string;
  date: string;
  runningBalance: number;
};

/**
 * calculateFIFO — matches Cash Out (payments) against Cash In (bills) in
 * strict chronological order (First In, First Out).
 *
 * Rules:
 *  - Each "Cash In" entry is treated as a Bill/Invoice.
 *  - "Cash Out" amounts are applied against the oldest unpaid bill first.
 *  - Returns an array of bill objects, each with its remaining unpaid amount,
 *    days since the bill was raised, and a settlement status.
 *  - Read-only: original transaction data is never mutated or deleted.
 */
export function calculateFIFO(transactions: Transaction[]): FIFOBill[] {
  // 1. Sort everything chronologically (oldest first)
  const sorted = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dateDiff !== 0 ? dateDiff : a.id - b.id;
  });

  // 2. Extract bills (Cash In) and build a mutable payments pool
  const bills: FIFOBill[] = sorted
    .filter((tx) => tx.type === "cash_in")
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      particular: tx.particular,
      originalAmount: tx.amount,
      paidAmount: 0,
      remainingAmount: tx.amount,
      daysOpen: 0,
      status: "unpaid",
    }));

  const paymentPool = sorted
    .filter((tx) => tx.type === "cash_out")
    .map((tx) => ({ available: tx.amount }));

  // 3. FIFO matching — apply each payment to the oldest unpaid/partial bill first
  for (const payment of paymentPool) {
    let leftover = payment.available;

    for (const bill of bills) {
      if (leftover <= 0) break;
      if (bill.remainingAmount <= 0) continue;

      const applied = Math.min(bill.remainingAmount, leftover);
      bill.remainingAmount = parseFloat((bill.remainingAmount - applied).toFixed(2));
      bill.paidAmount = parseFloat((bill.paidAmount + applied).toFixed(2));
      leftover = parseFloat((leftover - applied).toFixed(2));
    }
  }

  // 4. Calculate aging and resolve status
  const todayMs = new Date().setHours(0, 0, 0, 0);

  return bills.map((bill) => {
    const billMs = new Date(bill.date).setHours(0, 0, 0, 0);
    const daysOpen = Math.max(0, Math.floor((todayMs - billMs) / 86_400_000));

    let status: FIFOBill["status"];
    if (bill.remainingAmount < 0.01) {
      status = "cleared";
    } else if (bill.paidAmount > 0) {
      status = "partially_paid";
    } else {
      status = "unpaid";
    }

    return { ...bill, daysOpen, status };
  });
}
