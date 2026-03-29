import { useState } from "react";
import { Link, useRoute } from "wouter";
import { BookText, Plus, Menu, Moon, Sun, Wallet } from "lucide-react";
import { useListCashbooks } from "@workspace/api-client-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CashbookForm } from "@/components/forms/cashbook-form";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [match, params] = useRoute("/cashbooks/:id");
  const currentId = match ? parseInt(params.id) : null;

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-card/50 backdrop-blur-xl relative z-10 shadow-xl shadow-black/5">
        <SidebarContent currentId={currentId} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen relative">
        <Header currentId={currentId} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ currentId, onClose }: { currentId: number | null, onClose?: () => void }) {
  const { data: cashbooks = [], isLoading } = useListCashbooks();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 text-primary font-display font-bold text-2xl tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          Cashbook
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-2 mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">Your Ledgers</h3>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-display">Create New Cashbook</DialogTitle>
              </DialogHeader>
              <CashbookForm onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3 px-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : cashbooks.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground text-sm">
            No cashbooks yet. Create one to get started.
          </div>
        ) : (
          <nav className="space-y-1.5">
            {cashbooks.map(cb => (
              <Link 
                key={cb.id} 
                href={`/cashbooks/${cb.id}`} 
                onClick={onClose}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-all duration-200 group border border-transparent",
                  currentId === cb.id 
                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                    : "hover:bg-muted/60 text-foreground hover:border-border/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors",
                  currentId === cb.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
                )}>
                  <BookText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{cb.name}</p>
                  <p className={cn(
                    "text-xs truncate font-medium",
                    cb.totalBalance >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"
                  )}>
                    {formatCurrency(cb.totalBalance)}
                  </p>
                </div>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function Header({ currentId }: { currentId: number | null }) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="h-16 lg:h-20 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
      <div className="flex items-center">
        {/* Mobile menu trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden mr-2 -ml-2 rounded-full hover:bg-muted">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 border-r-border">
            <SidebarContent currentId={currentId} onClose={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full w-10 h-10 hover:bg-muted"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
        </Button>
      </div>
    </header>
  );
}
