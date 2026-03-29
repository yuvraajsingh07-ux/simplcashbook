import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateTransaction, getListTransactionsQueryKey, getGetCashbookQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  type: z.enum(["cash_in", "cash_out"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  particular: z.string().min(1, "Particulars/remarks required"),
  date: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof schema>;

export function TransactionForm({ 
  cashbookId, 
  defaultType = "cash_in",
  onSuccess 
}: { 
  cashbookId: number;
  defaultType?: "cash_in" | "cash_out";
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      date: today,
    }
  });

  const selectedType = watch("type");

  const createMutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        // Invalidate list of transactions and the specific cashbook to update total balance
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(cashbookId) });
        queryClient.invalidateQueries({ queryKey: getGetCashbookQueryKey(cashbookId) });
        toast({ title: "Transaction Saved", description: "Successfully recorded entry." });
        onSuccess();
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message || "Failed to save transaction", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({ cashbookId, data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      
      <div className="space-y-3">
        <Label>Entry Type</Label>
        <RadioGroup 
          defaultValue={defaultType} 
          onValueChange={(v) => setValue("type", v as any)}
          className="grid grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cash_in" id="in" className="peer sr-only" />
            <Label
              htmlFor="in"
              className="flex flex-1 items-center justify-center rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-emerald-50 hover:text-emerald-600 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 peer-data-[state=checked]:text-emerald-600 dark:hover:bg-emerald-900/20 dark:peer-data-[state=checked]:bg-emerald-900/30 dark:peer-data-[state=checked]:text-emerald-400 cursor-pointer font-semibold transition-all"
            >
              Cash In (+)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cash_out" id="out" className="peer sr-only" />
            <Label
              htmlFor="out"
              className="flex flex-1 items-center justify-center rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-rose-50 hover:text-rose-600 peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-rose-50 peer-data-[state=checked]:text-rose-600 dark:hover:bg-rose-900/20 dark:peer-data-[state=checked]:bg-rose-900/30 dark:peer-data-[state=checked]:text-rose-400 cursor-pointer font-semibold transition-all"
            >
              Cash Out (-)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input 
          id="date" 
          type="date" 
          {...register("date")} 
          className="h-12 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background"
        />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-muted-foreground font-medium">₹</span>
          <Input 
            id="amount" 
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
        <Label htmlFor="particular">Particulars / Remarks</Label>
        <Input 
          id="particular" 
          placeholder="e.g. Received from client..." 
          {...register("particular")} 
          className="h-12 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-background"
        />
        {errors.particular && <p className="text-sm text-destructive">{errors.particular.message}</p>}
      </div>

      <div className="pt-4 flex justify-end">
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          className={`w-full h-12 text-lg font-semibold rounded-xl text-white shadow-lg transition-all ${
            selectedType === 'cash_in' 
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25 hover:shadow-emerald-500/40' 
              : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25 hover:shadow-rose-500/40'
          }`}
        >
          {createMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Save {selectedType === 'cash_in' ? 'Cash In' : 'Cash Out'}
        </Button>
      </div>
    </form>
  );
}
