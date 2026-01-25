import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceItemRow } from './InvoiceItemRow';

interface InvoiceItem {
  id: string;
  vendorId: string;
  productId: string;
  quantity: number;
  grossWeight: number;
  boxWeight: number;
  benchesWeight: number;
  netWeight: number;
  rate: number;
  total: number;
}

interface InvoiceTableProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
}

export function InvoiceTable({ items, onItemsChange }: InvoiceTableProps) {
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: generateId(),
      vendorId: '',
      productId: '',
      quantity: 1,
      grossWeight: 0,
      boxWeight: 0,
      benchesWeight: 0,
      netWeight: 0,
      rate: 0,
      total: 0,
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    onItemsChange(
      items.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="invoice-cell text-left font-semibold text-muted-foreground w-12">#</th>
                <th className="invoice-cell text-left font-semibold text-muted-foreground min-w-[150px]">Vendor</th>
                <th className="invoice-cell text-left font-semibold text-muted-foreground min-w-[150px]">Item</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Qty</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Gross (kg)</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Box (kg)</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Benches (kg)</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Net (kg)</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Rate (₹)</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Total</th>
                <th className="invoice-cell w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <InvoiceItemRow
                  key={item.id}
                  index={index}
                  item={item}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    <p className="mb-2">No items added yet</p>
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add First Item
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={addItem} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Subtotal</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
              }).format(subtotal)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
