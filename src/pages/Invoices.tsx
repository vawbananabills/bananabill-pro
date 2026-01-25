import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Search, Filter, Download, Eye, Printer, Plus, Loader2, Edit, Trash } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvoices } from '@/hooks/useInvoices';
import { useInvoiceDetails } from '@/hooks/useInvoiceDetails';
import { InvoiceViewDialog } from '@/components/invoice/InvoiceViewDialog';

export default function Invoices() {
  const navigate = useNavigate();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const { data: invoiceDetails, isLoading: isLoadingDetails } = useInvoiceDetails(selectedInvoiceId);
  const { invoices, isLoading, deleteInvoice } = useInvoices();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInvoices = invoices.filter(inv => {
    const customerName = inv.customers?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(search.toLowerCase()) || 
                          inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDeleteClick = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (invoiceToDelete) {
      await deleteInvoice.mutateAsync(invoiceToDelete);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Invoices" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Invoices" subtitle="Manage all your sales invoices">
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" disabled>
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Link to="/invoice/new">
                <Button className="gap-2 w-full md:w-auto">
                  <Plus className="w-4 h-4" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card className="shadow-card overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <CardContent className="py-12 text-center text-muted-foreground">
              {invoices.length === 0 ? (
                <>
                  <p className="mb-2">No invoices yet</p>
                  <Link to="/invoice/new">
                    <Button variant="outline">Create Your First Invoice</Button>
                  </Link>
                </>
              ) : (
                <p>No invoices found matching your criteria.</p>
              )}
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="invoice-cell text-left font-semibold text-muted-foreground">Invoice #</th>
                    <th className="invoice-cell text-left font-semibold text-muted-foreground">Customer</th>
                    <th className="invoice-cell text-left font-semibold text-muted-foreground">Date</th>
                    <th className="invoice-cell text-right font-semibold text-muted-foreground">Amount</th>
                    <th className="invoice-cell text-center font-semibold text-muted-foreground">Status</th>
                    <th className="invoice-cell text-right font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="data-table-row">
                      <td className="invoice-cell font-mono font-medium text-primary">
                        {invoice.invoice_number}
                      </td>
                      <td className="invoice-cell font-medium">
                        {invoice.customers?.name || 'Unknown'}
                      </td>
                      <td className="invoice-cell text-muted-foreground">{invoice.date}</td>
                      <td className="invoice-cell text-right font-mono font-semibold">
                        {formatCurrency(Number(invoice.total))}
                      </td>
                      <td className="invoice-cell text-center">
                        <Badge 
                          variant="secondary" 
                          className={
                            invoice.status === 'paid' ? 'badge-paid' : 
                            invoice.status === 'pending' ? 'badge-pending' : 
                            'badge-credit'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                        <td className="invoice-cell">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="View"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="Edit"
                              onClick={() => navigate(`/invoice/edit/${invoice.id}`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="Print"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="Download"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete"
                              onClick={() => handleDeleteClick(invoice.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Invoice View Dialog */}
        <InvoiceViewDialog
          invoice={invoiceDetails || null}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this invoice? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}