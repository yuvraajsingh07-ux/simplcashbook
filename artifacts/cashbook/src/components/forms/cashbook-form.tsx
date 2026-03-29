import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateCashbook, getListCashbooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CashbookForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const createMutation = useCreateCashbook({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCashbooksQueryKey() });
        toast({ title: "Cashbook Created", description: "Successfully created new cashbook." });
        onSuccess();
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message || "Failed to create cashbook", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({ data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Cashbook Name</Label>
        <Input id="name" placeholder="e.g. Leelu Fauji" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" placeholder="Brief details about this ledger..." {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="pt-4 flex justify-end">
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Cashbook
        </Button>
      </div>
    </form>
  );
}
