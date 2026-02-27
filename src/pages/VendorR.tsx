import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Loader2 } from 'lucide-react';
import { useVendors } from '@/hooks/useVendors';
import { useVendorReceipts } from '@/hooks/useVendorReceipts';

export default function VendorR() {
  const { vendors, isLoading } = useVendors();
  const { receipts, isLoading: receiptsLoading } = useVendorReceipts();
  const [search, setSearch] = useState('');

  const summaryByVendor = receipts.reduce<
    Record<string, { totalBilled: number; totalPaid: number }>
  >((acc, r) => {
    const key = r.vendor_id;
    const existing = acc[key] || { totalBilled: 0, totalPaid: 0 };
    const finalTotal = Number(r.final_total || 0);
    const received = Number(r.amount_received || 0);
    acc[key] = {
      totalBilled: existing.totalBilled + finalTotal,
      totalPaid: existing.totalPaid + received,
    };
    return acc;
  }, {});

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone && v.phone.includes(search))
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  if (isLoading || receiptsLoading) {
    return (
      <DashboardLayout title="Vendor R" subtitle="Vendors for receipts only (no accounting)">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor R" subtitle="Use these vendors only for Vendor Receipts and view their party balance there.">
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Vendor R by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {filteredVendors.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              No vendors found. Add vendors from the main Vendors page.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => {
              const summary = summaryByVendor[vendor.id] || { totalBilled: 0, totalPaid: 0 };
              const advance = summary.totalPaid; // total cash already paid to vendor
              const balanceToPay = summary.totalBilled; // total bill amount to settle

              return (
                <Card key={vendor.id} className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Truck className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{vendor.name}</h3>
                          {vendor.phone && (
                            <p className="text-xs text-muted-foreground">{vendor.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Vendor Receipt Summary</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            advance > 0 ? 'badge-paid' : 'bg-muted text-muted-foreground'
                          }
                        >
                          Paid (Advance): {formatCurrency(advance)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            balanceToPay > 0 ? 'badge-credit' : 'bg-muted text-muted-foreground'
                          }
                        >
                          Balance to Pay: {formatCurrency(balanceToPay)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

