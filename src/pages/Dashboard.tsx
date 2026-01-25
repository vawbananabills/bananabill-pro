import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  IndianRupee, 
  Users, 
  Truck, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useInvoices } from '@/hooks/useInvoices';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { invoices, isLoading: invoicesLoading } = useInvoices();

  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const recentInvoices = invoices.slice(0, 5);

  if (statsLoading || invoicesLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back, here's your business overview">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(stats?.todaySales || 0)}
            icon={<IndianRupee className="w-5 h-5" />}
          />
          <StatCard
            title="This Week"
            value={formatCurrency(stats?.weekSales || 0)}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            title="Total Customers"
            value={String(stats?.totalCustomers || 0)}
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            title="Active Vendors"
            value={String(stats?.totalVendors || 0)}
            icon={<Truck className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Invoices */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
              <Link to="/invoices">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices yet</p>
                  <Link to="/invoice/new">
                    <Button variant="outline" size="sm" className="mt-3">
                      Create First Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.customers?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono">{formatCurrency(Number(invoice.total))}</p>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Month Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.monthSales || 0)}</p>
                </div>
                <div className="p-4 rounded-lg bg-warning/10">
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold text-warning">{formatCurrency(stats?.pendingAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/invoice/new">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <FileText className="w-5 h-5" />
                  <span>New Invoice</span>
                </Button>
              </Link>
              <Link to="/customers">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="w-5 h-5" />
                  <span>Add Customer</span>
                </Button>
              </Link>
              <Link to="/vendors">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Truck className="w-5 h-5" />
                  <span>Add Vendor</span>
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>View Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
