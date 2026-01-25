import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWeeklyInvoices, WeeklyInvoice } from '@/hooks/useWeeklyInvoices';
import { format } from 'date-fns';
import { Calendar, Trash2, Eye, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SavedWeeklyInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewInvoice?: (invoice: WeeklyInvoice) => void;
}

export function SavedWeeklyInvoicesDialog({ open, onOpenChange, onViewInvoice }: SavedWeeklyInvoicesDialogProps) {
  const { weeklyInvoices, isLoading, deleteWeeklyInvoice } = useWeeklyInvoices();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteWeeklyInvoice.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Saved Weekly Invoices
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : weeklyInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved weekly invoices yet</p>
                <p className="text-sm mt-1">Create and save a weekly invoice to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{invoice.customers?.name || 'Unknown Customer'}</h3>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(invoice.date_from), 'dd MMM')} - {format(new Date(invoice.date_to), 'dd MMM yyyy')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Subtotal:</span>
                            <p className="font-mono font-medium">{formatCurrency(Number(invoice.subtotal))}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Closing Balance:</span>
                            <p className="font-mono font-semibold text-primary">{formatCurrency(Number(invoice.closing_balance))}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items:</span>
                            <p className="font-mono">{invoice.total_items}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Weight:</span>
                            <p className="font-mono">{Number(invoice.total_net_weight).toFixed(2)} kg</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Saved on {format(new Date(invoice.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {onViewInvoice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewInvoice(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(invoice.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weekly Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved weekly invoice will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteWeeklyInvoice.isPending}
            >
              {deleteWeeklyInvoice.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
