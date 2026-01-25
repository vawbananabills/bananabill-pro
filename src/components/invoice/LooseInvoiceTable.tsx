import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLooseProducts } from '@/hooks/useLooseProducts';
import { useVendors } from '@/hooks/useVendors';

export interface LooseInvoiceItem {
  id: string;
  vendorId: string;
  looseProductId: string;
  productName: string;
  netWeight: number;
  weightUnit: 'kg' | 'g';
  rate: number;
  total: number;
}

interface LooseInvoiceTableProps {
  items: LooseInvoiceItem[];
  onItemsChange: (items: LooseInvoiceItem[]) => void;
}

function LooseInvoiceItemRow({
  index,
  item,
  onChange,
  onRemove,
}: {
  index: number;
  item: LooseInvoiceItem;
  onChange: (id: string, updates: Partial<LooseInvoiceItem>) => void;
  onRemove: (id: string) => void;
}) {
  const { looseProducts } = useLooseProducts();
  const { vendors } = useVendors();
  const [localItem, setLocalItem] = useState(item);

  useEffect(() => {
    // Calculate total when weight or rate changes
    let weightInKg = localItem.netWeight;
    if (localItem.weightUnit === 'g') {
      weightInKg = localItem.netWeight / 1000;
    }
    const total = weightInKg * localItem.rate;
    
    if (total !== localItem.total) {
      setLocalItem(prev => ({ ...prev, total }));
      onChange(localItem.id, { ...localItem, total });
    }
  }, [localItem.netWeight, localItem.weightUnit, localItem.rate]);

  const handleChange = (field: keyof LooseInvoiceItem, value: any) => {
    let updates: Partial<LooseInvoiceItem> = { [field]: value };
    
    // When product changes, update name and default rate
    if (field === 'looseProductId') {
      const product = looseProducts.find(p => p.id === value);
      if (product) {
        updates = {
          ...updates,
          productName: product.name,
          rate: product.default_rate,
        };
      }
    }
    
    const newItem = { ...localItem, ...updates };
    setLocalItem(newItem);
    onChange(localItem.id, updates);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="number"]:not([disabled])');
      const inputsArray = Array.from(inputs);
      const currentIndex = inputsArray.indexOf(e.currentTarget);
      if (currentIndex !== -1 && currentIndex < inputsArray.length - 1) {
        inputsArray[currentIndex + 1].focus();
        inputsArray[currentIndex + 1].select();
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <tr className="data-table-row">
      <td className="invoice-cell text-center text-muted-foreground">{index + 1}</td>
      <td className="invoice-cell">
        <Select value={localItem.vendorId} onValueChange={(v) => handleChange('vendorId', v)}>
          <SelectTrigger className="w-full min-w-[140px]">
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="invoice-cell">
        <Select value={localItem.looseProductId} onValueChange={(v) => handleChange('looseProductId', v)}>
          <SelectTrigger className="w-full min-w-[140px]">
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {looseProducts.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="invoice-cell">
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={localItem.netWeight || ''}
            onChange={(e) => handleChange('netWeight', parseFloat(e.target.value) || 0)}
            onKeyDown={handleKeyDown}
            className="w-24 text-right font-mono"
            placeholder="0.00"
          />
          <Select 
            value={localItem.weightUnit} 
            onValueChange={(v: 'kg' | 'g') => handleChange('weightUnit', v)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="g">g</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="invoice-cell">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={localItem.rate || ''}
          onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 0)}
          onKeyDown={handleKeyDown}
          className="w-24 text-right font-mono"
          placeholder="0.00"
        />
      </td>
      <td className="invoice-cell text-right font-mono font-semibold text-primary">
        {formatCurrency(localItem.total)}
      </td>
      <td className="invoice-cell">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(localItem.id)}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}

export function LooseInvoiceTable({ items, onItemsChange }: LooseInvoiceTableProps) {
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addItem = () => {
    const newItem: LooseInvoiceItem = {
      id: generateId(),
      vendorId: '',
      looseProductId: '',
      productName: '',
      netWeight: 0,
      weightUnit: 'kg',
      rate: 0,
      total: 0,
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<LooseInvoiceItem>) => {
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
                <th className="invoice-cell text-left font-semibold text-muted-foreground min-w-[140px]">Vendor</th>
                <th className="invoice-cell text-left font-semibold text-muted-foreground min-w-[150px]">Item</th>
                <th className="invoice-cell text-left font-semibold text-muted-foreground">Net Weight</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Rate (₹/kg)</th>
                <th className="invoice-cell text-right font-semibold text-muted-foreground">Total</th>
                <th className="invoice-cell w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <LooseInvoiceItemRow
                  key={item.id}
                  index={index}
                  item={item}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No loose items added</p>
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Loose Item
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
            Add Loose Item
          </Button>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Loose Items Subtotal</p>
            <p className="text-xl font-bold">
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
