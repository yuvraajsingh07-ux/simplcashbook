import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { 
  useGetCashbook, 
  useListTransactions, 
  useDeleteTransaction,
  getListTransactionsQueryKey,
  getGetCashbookQueryKey
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { exportLedgerToPDF } from "@/lib/pdf-export";
import { Search, FileDown, Plus, Trash2, TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/forms/transaction-form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function CashbookView() {
  const [, params] = useRoute("/cashbooks/:id");
  const cashbookId = parseInt(params!.id);
  
  const [search, setSearch] = useState("");
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"cash_in" | "cash_out" | "transfer">("cash_in");

  const { data: cashbook, isLoading: isLoadingCb } = useGetCashbook(cashbookId);
  const { data: txResponse, isLoading: isLoadingTx } = useListTransactions(cashbookId, { search: search || undefined });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteTransaction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(cashbookId) });
        queryClient.invalidateQueries({ queryKey: getGetCashbookQueryKey(cashbookId) });
        toast({ title: "Deleted", description: "Transaction removed successfully." });
      }
    }
  });

  const handleDelete = (txId: number) => {
    if (confirm("Are you sure you want to delete this transaction? This will affect the running balance.")) {
      deleteMutation.mutate({ cashbookId, transactionId: txId });
    }
  };

  const handleExport = () => {
    if (cashbook && txResponse?.transactions) {
      exportLedgerToPDF(cashbook, txResponse.transactions);
      toast({ title: "Exported", description: "PDF generated successfully." });
    }
  };

  const groupedTransactions = useMemo(() => {
    if (!txResponse?.transactions) return {};
    const grouped: Record<string, typeof txResponse.transactions> = {};
    
    // Sort transactions by date descending, then ID descending
    const sorted = [...txResponse.transactions].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id - a.id;
    });

    sorted.forEach(tx => {
      if (!grouped[tx.date]) grouped[tx.date] = [];
      grouped[tx.date].push(tx);
    });
    return grouped;
  }, [txResponse]);

  const isLoading = isLoadingCb || isLoadingTx;

  return (
    <AppLayout>
      <div className="flex flex-col h-full relative">
        
        {/* Cashbook Header Dashboard */}
        <div className="bg-card border-b border-border shadow-sm p-4 lg:p-8 flex-shrink-0 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

          {isLoadingCb ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-12 bg-muted rounded w-1/2"></div>
            </div>
          ) : cashbook ? (
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">{cashbook.name}</h1>
                <p className="text-muted-foreground text-sm max-w-md">{cashbook.description || "Manage your daily cash transactions."}</p>
                
                <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Balance</p>
                    <p className={cn(
                      "text-3xl lg:text-4xl font-bold tracking-tight",
                      cashbook.totalBalance >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"
                    )}>
                      {formatCurrency(cashbook.totalBalance)}
                    </p>
                  </div>
                  <div className="flex gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/50 sm:pl-8">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1 text-emerald-500" /> Total In</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(cashbook.totalCashIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center"><TrendingDown className="w-3 h-3 mr-1 text-rose-500" /> Total Out</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(cashbook.totalCashOut)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search remarks..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-background/50 rounded-xl"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleExport}
                  className="rounded-xl bg-background/50 hover:bg-muted shadow-sm"
                  title="Export to PDF"
                >
                  <FileDown className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Export PDF</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4">Cashbook not found.</div>
          )}
        </div>

        {/* Ledger List */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-32">
          {isLoadingTx ? (
             <div className="space-y-4 max-w-5xl mx-auto">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
               ))}
             </div>
          ) : Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <p>{search ? "No transactions match your search." : "No transactions yet. Add your first entry below."}</p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8">
              {Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date} className="relative">
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{formatDate(date)}</h3>
                  </div>
                  <div className="space-y-3">
                    {txs.map((tx, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={tx.id} 
                        className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-medium text-foreground truncate">{tx.particular}</p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono tracking-tight">Bal: {formatCurrency(tx.runningBalance)}</p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div className={cn(
                            "font-bold text-lg",
                            tx.type === 'cash_in' ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"
                          )}>
                            {tx.type === 'cash_in' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                              <DropdownMenuItem 
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                onClick={() => handleDelete(tx.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button — single "Add Entry" */}
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50">
          <Button
            onClick={() => { setDefaultTab("cash_in"); setIsTxOpen(true); }}
            className="h-14 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center gap-2 font-semibold text-base"
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </Button>
        </div>

        {/* Transaction Dialog */}
        <Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-2xl font-display">New Entry</DialogTitle>
            </DialogHeader>
            <TransactionForm
              cashbookId={cashbookId}
              defaultTab={defaultTab}
              onSuccess={() => setIsTxOpen(false)}
            />
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
