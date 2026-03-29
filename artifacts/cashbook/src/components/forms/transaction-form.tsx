import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateTransaction,
  useCreateTransfer,
  useListCashbooks,
  getListTransactionsQueryKey,
  getGetCashbookQueryKey,
  getListCashbooksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRightLeft } from "lucide-react";

const txSchema = z.object({
  type: z.enum(["cash_in", "cash_out"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  particular: z.string().min(1, "Particulars/remarks required"),
  date: z.string().min(1, "Date is required"),
});

const transferSchema = z.object({
  fromCashbookId: z.string().min(1, "Select source ledger"),
  toCashbookId: z.string().min(1, "Select destination ledger"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  particular: z.string().min(1, "Particulars/remarks required"),
  date: z.string().min(1, "Date is required"),
}).refine((d) => d.fromCashbookId !== d.toCashbookId, {
  message: "Source and destination must be different",
  path: ["toCashbookId"],
});

type TxFormData = z.infer<typeof txSchema>;
type TransferFormData = z.infer<typeof transferSchema>;

const today = new Date().toISOString().split("T")[0];

function CashEntryForm({
  cashbookId,
  type,
  onSuccess,
}: {
  cashbookId: number;
  type: "cash_in" | "cash_out";
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<TxFormData>({
    resolver: zodResolver(txSchema),
    defaultValues: { type, date: today },
  });

  const createMutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(cashbookId) });
        queryClient.invalidateQueries({ queryKey: getGetCashbookQueryKey(cashbookId) });
        queryClient.invalidateQueries({ queryKey: getListCashbooksQueryKey() });
        toast({ title: type === "cash_in" ? "Cash In Saved" : "Cash Out Saved", description: "Entry recorded successfully." });
        onSuccess();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save entry. Please try again.", variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: TxFormData) => {
    createMutation.mutate({ cashbookId, data: { ...data, type } });
  };

  const isCashIn = type === "cash_in";
  const colorClass = isCashIn
    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
    : "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
  const btnClass = isCashIn
    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/40"
    : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30 hover:shadow-rose-500/40";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
      <input type="hidden" {...register("type")} value={type} />

      <div className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold ${colorClass}`}>
        {isCashIn ? "+ Cash In (Credit)" : "- Cash Out (Debit)"}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`date-${type}`}>Date</Label>
        <Input
          id={`date-${type}`}
          type="date"
          {...register("date")}
          className="h-12 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background"
        />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`amount-${type}`}>Amount</Label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-muted-foreground font-medium">₹</span>
          <Input
            id={`amount-${type}`}
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
            className="pl-9 h-12 rounded-xl text-lg font-semibold bg-muted/50 border-transparent focus:border-primary focus:bg-background"
          />
        </div>
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`particular-${type}`}>Particulars / Remarks</Label>
        <Input
          id={`particular-${type}`}
          placeholder={isCashIn ? "e.g. Received from client..." : "e.g. Paid to supplier..."}
          {...register("particular")}
          className="h-12 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background"
        />
        {errors.particular && <p className="text-sm text-destructive">{errors.particular.message}</p>}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className={`w-full h-12 text-base font-semibold rounded-xl text-white shadow-lg transition-all ${btnClass}`}
        >
          {createMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Save {isCashIn ? "Cash In" : "Cash Out"}
        </Button>
      </div>
    </form>
  );
}

function TransferForm({
  currentCashbookId,
  onSuccess,
}: {
  currentCashbookId: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cashbooks = [] } = useListCashbooks();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromCashbookId: String(currentCashbookId),
      date: today,
    },
  });

  const fromId = watch("fromCashbookId");
  const toId = watch("toCashbookId");

  const transferMutation = useCreateTransfer({
    mutation: {
      onSuccess: (data) => {
        const srcId = data.sourceTransaction.cashbookId;
        const dstId = data.destinationTransaction.cashbookId;
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(srcId) });
        queryClient.invalidateQueries({ queryKey: getGetCashbookQueryKey(srcId) });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(dstId) });
        queryClient.invalidateQueries({ queryKey: getGetCashbookQueryKey(dstId) });
        queryClient.invalidateQueries({ queryKey: getListCashbooksQueryKey() });
        toast({ title: "Transfer Complete", description: "Two linked entries created successfully." });
        onSuccess();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to complete transfer. Please try again.", variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: TransferFormData) => {
    transferMutation.mutate({
      data: {
        fromCashbookId: parseInt(data.fromCashbookId),
        toCashbookId: parseInt(data.toCashbookId),
        amount: data.amount,
        particular: data.particular,
        date: data.date,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
      <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4" />
        Debit source · Credit destination
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>From (Source)</Label>
          <Select
            value={fromId}
            onValueChange={(v) => setValue("fromCashbookId", v, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-transparent">
              <SelectValue placeholder="Select ledger" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {cashbooks.map((cb) => (
                <SelectItem key={cb.id} value={String(cb.id)} disabled={String(cb.id) === toId}>
                  {cb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.fromCashbookId && <p className="text-sm text-destructive">{errors.fromCashbookId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>To (Destination)</Label>
          <Select
            value={toId}
            onValueChange={(v) => setValue("toCashbookId", v, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-transparent">
              <SelectValue placeholder="Select ledger" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {cashbooks.map((cb) => (
                <SelectItem key={cb.id} value={String(cb.id)} disabled={String(cb.id) === fromId}>
                  {cb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.toCashbookId && <p className="text-sm text-destructive">{errors.toCashbookId.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-date">Date</Label>
        <Input
          id="transfer-date"
          type="date"
          {...register("date")}
          className="h-12 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background"
        />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-muted-foreground font-medium">₹</span>
          <Input
            id="transfer-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
            className="pl-9 h-12 rounded-xl text-lg font-semibold bg-muted/50 border-transparent focus:border-primary focus:bg-background"
          />
        </div>
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-particular">Particulars / Remarks</Label>
        <Input
          id="transfer-particular"
          placeholder="e.g. Monthly settlement..."
          {...register("particular")}
          className="h-12 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background"
        />
        {errors.particular && <p className="text-sm text-destructive">{errors.particular.message}</p>}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={transferMutation.isPending}
          className="w-full h-12 text-base font-semibold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all"
        >
          {transferMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Save Transfer
        </Button>
      </div>
    </form>
  );
}

export function TransactionForm({
  cashbookId,
  defaultTab = "cash_in",
  onSuccess,
}: {
  cashbookId: number;
  defaultTab?: "cash_in" | "cash_out" | "transfer";
  onSuccess: () => void;
}) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 rounded-xl h-11 bg-muted/70 p-1">
        <TabsTrigger value="cash_in" className="rounded-lg text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
          Cash In
        </TabsTrigger>
        <TabsTrigger value="cash_out" className="rounded-lg text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-rose-600 data-[state=active]:shadow-sm">
          Cash Out
        </TabsTrigger>
        <TabsTrigger value="transfer" className="rounded-lg text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
          Transfer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cash_in">
        <CashEntryForm cashbookId={cashbookId} type="cash_in" onSuccess={onSuccess} />
      </TabsContent>
      <TabsContent value="cash_out">
        <CashEntryForm cashbookId={cashbookId} type="cash_out" onSuccess={onSuccess} />
      </TabsContent>
      <TabsContent value="transfer">
        <TransferForm currentCashbookId={cashbookId} onSuccess={onSuccess} />
      </TabsContent>
    </Tabs>
  );
}
