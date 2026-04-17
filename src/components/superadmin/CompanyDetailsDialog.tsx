import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp,
  Loader2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Package,
  UserCheck,
  Truck,
  IndianRupee,
  Clock,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CompanyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
}

interface CompanyDetails {
  company: any;
  users: any[];
  customers: any[];
  vendors: any[];
  invoices: any[];
  products: any[];
  payments: any[];
  monthlySales: { month: string; sales: number; payments: number; invoices: number }[];
  topProducts: { name: string; revenue: number; qty: number }[];
  topCustomers: { name: string; total: number }[];
  stats: {
    totalSales: number;
    totalPayments: number;
    pendingAmount: number;
    lastInvoiceDate: string | null;
    thisMonthSales: number;
    thisMonthInvoices: number;
  };
}

function formatCurrency(amount: number) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

export function CompanyDetailsDialog({ open, onOpenChange, companyId }: CompanyDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [detailedView, setDetailedView] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      fetchCompanyDetails();
    }
  }, [open, companyId]);

  const fetchCompanyDetails = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Fetch company
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      // Fetch users
      const { data: users } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .eq('company_id', companyId);

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Fetch vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Fetch ALL invoices for accurate balance calculation (not limited)
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('company_id', companyId)
        .order('date', { ascending: false });

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId);

      // Fetch ALL payments for accurate balance calculation
      const { data: allPayments } = await supabase
        .from('payments')
        .select('*, customers(name)')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      // Fetch party adjustments
      const { data: adjustments } = await supabase
        .from('party_adjustments')
        .select('*')
        .eq('company_id', companyId);

      // Calculate customer balances dynamically
      const customersWithBalances = (customers || []).map(customer => {
        const customerInvoices = (allInvoices || []).filter(inv => inv.customer_id === customer.id);
        const customerPayments = (allPayments || []).filter(p => p.customer_id === customer.id);
        const customerAdjustments = (adjustments || []).filter(a => a.customer_id === customer.id);
        
        const totalInvoices = customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalPayments = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalAdjustments = customerAdjustments.reduce((sum, a) => {
          return sum + (a.type === 'deduction' ? a.amount : -a.amount);
        }, 0);
        
        const calculatedBalance = (customer.opening_balance || 0) + totalInvoices - totalPayments - totalAdjustments;
        
        return {
          ...customer,
          balance: calculatedBalance,
        };
      });

      // Calculate vendor balances dynamically (fetch purchases for vendors)
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('company_id', companyId);

      const vendorsWithBalances = (vendors || []).map(vendor => {
        const vendorPurchases = (purchases || []).filter(p => p.vendor_id === vendor.id);
        const totalPurchases = vendorPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
        
        // Vendors don't have payments in same table, balance = opening_balance + purchases
        const calculatedBalance = (vendor.opening_balance || 0) + totalPurchases;
        
        return {
          ...vendor,
          balance: calculatedBalance,
        };
      });

      // Calculate stats
      const totalSales = allInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const totalPaymentsAmount = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingAmount = totalSales - totalPaymentsAmount;
      const lastInvoiceDate = allInvoices?.[0]?.date || null;

      // This month stats
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthInvoices = allInvoices?.filter(inv => new Date(inv.date) >= thisMonthStart) || [];
      const thisMonthSales = thisMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Build monthly sales (last 6 months)
      const monthlyMap = new Map<string, { sales: number; payments: number; invoices: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { sales: 0, payments: 0, invoices: 0 });
      }
      (allInvoices || []).forEach(inv => {
        const d = new Date(inv.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = monthlyMap.get(key);
        if (m) { m.sales += inv.total || 0; m.invoices += 1; }
      });
      (allPayments || []).forEach(p => {
        const d = new Date(p.payment_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = monthlyMap.get(key);
        if (m) { m.payments += p.amount || 0; }
      });
      const monthlySales = Array.from(monthlyMap.entries()).map(([key, v]) => {
        const [y, mo] = key.split('-');
        const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en', { month: 'short' });
        return { month: label, ...v };
      });

      // Top products by revenue (from invoice_items)
      const { data: invItems } = await supabase
        .from('invoice_items')
        .select('product_id, quantity, total, invoices!inner(company_id)')
        .eq('invoices.company_id', companyId);
      const productAgg = new Map<string, { revenue: number; qty: number }>();
      (invItems || []).forEach((it: any) => {
        if (!it.product_id) return;
        const cur = productAgg.get(it.product_id) || { revenue: 0, qty: 0 };
        cur.revenue += it.total || 0;
        cur.qty += it.quantity || 0;
        productAgg.set(it.product_id, cur);
      });
      const productMap = new Map((products || []).map(p => [p.id, p.name]));
      const topProducts = Array.from(productAgg.entries())
        .map(([id, v]) => ({ name: productMap.get(id) || 'Unknown', ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Top customers by total invoiced
      const customerAgg = new Map<string, number>();
      (allInvoices || []).forEach(inv => {
        if (!inv.customer_id) return;
        customerAgg.set(inv.customer_id, (customerAgg.get(inv.customer_id) || 0) + (inv.total || 0));
      });
      const customerMap = new Map((customers || []).map(c => [c.id, c.name]));
      const topCustomers = Array.from(customerAgg.entries())
        .map(([id, total]) => ({ name: customerMap.get(id) || 'Unknown', total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setDetails({
        company,
        users: users || [],
        customers: customersWithBalances,
        vendors: vendorsWithBalances,
        invoices: allInvoices || [],
        products: products || [],
        payments: allPayments || [],
        monthlySales,
        topProducts,
        topCustomers,
        stats: {
          totalSales,
          totalPayments: totalPaymentsAmount,
          pendingAmount,
          lastInvoiceDate,
          thisMonthSales,
          thisMonthInvoices: thisMonthInvoices.length,
        },
      });
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={detailedView ? "max-w-[98vw] w-[98vw] max-h-[96vh] overflow-hidden flex flex-col" : "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {loading ? 'Loading...' : details?.company?.name || 'Company Details'}
            </DialogTitle>
            <Button
              variant={detailedView ? "secondary" : "outline"}
              size="sm"
              onClick={() => setDetailedView(v => !v)}
              className="gap-1.5"
            >
              {detailedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{detailedView ? 'Compact View' : 'Detailed View'}</span>
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : details ? (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            <div className="space-y-6 pb-6">
              {/* Company Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {details.company?.email || 'No email'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {details.company?.phone || 'No phone'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {details.company?.address || 'No address'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">GST Number:</span>{' '}
                        <span className="font-medium">{details.company?.gst_number || 'N/A'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Invoice Prefix:</span>{' '}
                        <span className="font-medium">{details.company?.invoice_prefix || 'INV-'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Next Invoice #:</span>{' '}
                        <span className="font-medium">{details.company?.next_invoice_number || 1}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Created:</span>{' '}
                        <span className="font-medium">
                          {details.company?.created_at 
                            ? format(new Date(details.company.created_at), 'PPP') 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Status:</span>{' '}
                        <Badge variant={details.company?.is_active ? 'default' : 'destructive'}>
                          {details.company?.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Total Sales</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{formatCurrency(details.stats.totalSales)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Payments</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{formatCurrency(details.stats.totalPayments)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{formatCurrency(details.stats.pendingAmount)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Customers</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{details.customers.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Vendors</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{details.vendors.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Products</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{details.products.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* This Month Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    This Month Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Invoices Created</div>
                      <div className="text-2xl font-bold">{details.stats.thisMonthInvoices}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sales This Month</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(details.stats.thisMonthSales)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Billed</div>
                      <div className="text-lg font-medium">
                        {details.stats.lastInvoiceDate 
                          ? format(new Date(details.stats.lastInvoiceDate), 'MMM d, yyyy')
                          : 'Never'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Invoices</div>
                      <div className="text-2xl font-bold">{details.invoices.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for detailed data */}
              <Tabs defaultValue="reports" className="space-y-4">
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="reports" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Reports
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="gap-1">
                    <UserCheck className="w-3 h-3" />
                    Customers ({details.customers.length})
                  </TabsTrigger>
                  <TabsTrigger value="vendors" className="gap-1">
                    <Truck className="w-3 h-3" />
                    Vendors ({details.vendors.length})
                  </TabsTrigger>
                  <TabsTrigger value="products" className="gap-1">
                    <Package className="w-3 h-3" />
                    Products ({details.products.length})
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="gap-1">
                    <FileText className="w-3 h-3" />
                    Invoices ({details.invoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="users" className="gap-1">
                    <Users className="w-3 h-3" />
                    Users ({details.users.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="customers">
                  <Card>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailedView ? details.customers : details.customers.slice(0, 20)).map((customer) => (
                            <TableRow key={customer.id}>
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell>{customer.phone || '-'}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{customer.address || '-'}</TableCell>
                              <TableCell className="text-right">
                                <span className={customer.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {formatCurrency(Math.abs(customer.balance || 0))}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {details.customers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No customers found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vendors">
                  <Card>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailedView ? details.vendors : details.vendors.slice(0, 20)).map((vendor) => (
                            <TableRow key={vendor.id}>
                              <TableCell className="font-medium">{vendor.name}</TableCell>
                              <TableCell>{vendor.phone || '-'}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{vendor.address || '-'}</TableCell>
                              <TableCell className="text-right">
                                <span className={vendor.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {formatCurrency(Math.abs(vendor.balance || 0))}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {details.vendors.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No vendors found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="invoices">
                  <Card>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailedView ? details.invoices : details.invoices.slice(0, 20)).map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                              <TableCell>{format(new Date(invoice.date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{(invoice.customers as any)?.name || 'Cash'}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(invoice.total || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {details.invoices.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No invoices found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="users">
                  <Card>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {(user.user_roles as any)?.[0]?.role || 'user'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.created_at 
                                  ? format(new Date(user.created_at), 'MMM d, yyyy')
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {details.users.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No users found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load company details
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
