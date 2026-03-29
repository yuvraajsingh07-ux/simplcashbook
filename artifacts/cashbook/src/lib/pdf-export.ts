import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Cashbook, TransactionWithBalance } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "./utils";

export function exportLedgerToPDF(cashbook: Cashbook, transactions: TransactionWithBalance[]) {
  const doc = new jsPDF();
  const title = `${cashbook.name} - Ledger Report`;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 22);

  // Subheader Details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, 14, 30);
  
  doc.text(`Total Cash In: ${formatCurrency(cashbook.totalCashIn)}`, 14, 38);
  doc.text(`Total Cash Out: ${formatCurrency(cashbook.totalCashOut)}`, 80, 38);
  doc.text(`Net Balance: ${formatCurrency(cashbook.totalBalance)}`, 150, 38);

  // Table Data
  const tableData = transactions.map(tx => [
    formatDate(tx.date),
    tx.particular,
    tx.type === 'cash_in' ? formatCurrency(tx.amount) : "-",
    tx.type === 'cash_out' ? formatCurrency(tx.amount) : "-",
    formatCurrency(tx.runningBalance)
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Particulars', 'Cash In', 'Cash Out', 'Balance']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [63, 63, 70], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right', textColor: [22, 163, 74] },
      3: { cellWidth: 30, halign: 'right', textColor: [225, 29, 72] },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`${cashbook.name.replace(/\s+/g, '_')}_Ledger.pdf`);
}
