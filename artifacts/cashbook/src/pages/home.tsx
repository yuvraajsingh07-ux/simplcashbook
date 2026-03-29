import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListCashbooks } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CashbookForm } from "@/components/forms/cashbook-form";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: cashbooks, isLoading } = useListCashbooks();
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && cashbooks && cashbooks.length > 0) {
      setLocation(`/cashbooks/${cashbooks[0].id}`);
    }
  }, [cashbooks, isLoading, setLocation]);

  if (isLoading || (cashbooks && cashbooks.length > 0)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse flex flex-col items-center">
            <Wallet className="w-12 h-12 text-muted mb-4" />
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full p-6 text-center max-w-lg mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card p-8 md:p-12 rounded-3xl shadow-xl shadow-black/5 border border-border w-full flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-12 h-12" />
          </div>
          
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            Welcome to Cashbook
          </h1>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Track your daily cash in, cash out, and maintain live running balances. Create your first ledger to get started.
          </p>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto px-8 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Create First Cashbook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-display">Create New Cashbook</DialogTitle>
              </DialogHeader>
              <CashbookForm onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </AppLayout>
  );
}
