import { useState, useEffect, useRef } from 'react';
import { Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useVendors } from '@/hooks/useVendors';
import { useProducts } from '@/hooks/useProducts';
import { useUnits } from '@/hooks/useUnits';

interface InvoiceItemRowProps {
  index: number;
  item: {
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
  };
  onChange: (id: string, updates: Partial<InvoiceItemRowProps['item']>) => void;
  onRemove: (id: string) => void;
}

export function InvoiceItemRow({ 
  index, 
  item, 
  onChange, 
  onRemove 
}: InvoiceItemRowProps) {
  const { vendors } = useVendors();
  const { products } = useProducts();
  const { units } = useUnits();
  const [localItem, setLocalItem] = useState(item);
  const [productOpen, setProductOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);

  useEffect(() => {
    // Calculate total box weight based on quantity and product's box weight
    const product = products.find(p => p.id === localItem.productId);
    let totalBoxWeight = localItem.boxWeight;
    
    if (product && localItem.quantity >= 0) {
      const boxWeightUnit = units.find(u => u.id === product.box_weight_unit_id);
      const weightMultiplier = boxWeightUnit?.weight_value || 1;
      totalBoxWeight = (product.box_weight || 0) * weightMultiplier * localItem.quantity;
    }
    
    const netWeight = Math.max(0, localItem.grossWeight - totalBoxWeight - localItem.benchesWeight);
    const total = netWeight * localItem.rate;
    
    if (netWeight !== localItem.netWeight || total !== localItem.total || totalBoxWeight !== localItem.boxWeight) {
      const updates = { ...localItem, netWeight, total, boxWeight: totalBoxWeight };
      setLocalItem(updates);
      onChange(item.id, updates);
    }
  }, [localItem.grossWeight, localItem.boxWeight, localItem.benchesWeight, localItem.rate, localItem.quantity, localItem.productId, products, units]);

  const handleChange = (field: string, value: string | number) => {
    const updates = { ...localItem, [field]: value };
    setLocalItem(updates);
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updates.rate = Number(product.default_rate);
        // Calculate box weight based on product's fixed box weight and quantity
        const boxWeightUnit = units.find(u => u.id === product.box_weight_unit_id);
        const weightMultiplier = boxWeightUnit?.weight_value || 1;
        updates.boxWeight = (product.box_weight || 0) * weightMultiplier * (updates.quantity ?? 1);
        setLocalItem(updates);
      }
    }
    
    if (field === 'quantity') {
      const product = products.find(p => p.id === localItem.productId);
      if (product) {
        const boxWeightUnit = units.find(u => u.id === product.box_weight_unit_id);
        const weightMultiplier = boxWeightUnit?.weight_value || 1;
        const qty = Number(value);
        updates.boxWeight = (product.box_weight || 0) * weightMultiplier * (isNaN(qty) ? 0 : qty);
        setLocalItem(updates);
      }
    }
    
    onChange(item.id, updates);
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
    <tr className="data-table-row group animate-fade-in">
      <td className="invoice-cell text-center text-muted-foreground font-medium">
        {index + 1}
      </td>
      <td className="invoice-cell">
        <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={vendorOpen}
              className="h-9 min-w-[140px] justify-between font-normal"
            >
              {localItem.vendorId
                ? vendors.find((v) => v.id === localItem.vendorId)?.name
                : "Select vendor"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search vendor..." />
              <CommandList>
                <CommandEmpty>No vendor found.</CommandEmpty>
                <CommandGroup>
                  {vendors.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={v.name}
                      onSelect={() => {
                        handleChange('vendorId', v.id);
                        setVendorOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          localItem.vendorId === v.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {v.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td className="invoice-cell">
        <Popover open={productOpen} onOpenChange={setProductOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productOpen}
              className="h-9 min-w-[140px] justify-between font-normal"
            >
              {localItem.productId
                ? products.find((p) => p.id === localItem.productId)?.name
                : "Select item"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search item..." />
              <CommandList>
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                  {products.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => {
                        handleChange('productId', p.id);
                        setProductOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          localItem.productId === p.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td className="invoice-cell">
        <Input
          type="number"
          value={localItem.quantity === 0 ? '0' : (localItem.quantity || '')}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('quantity', val === '' ? 0 : parseFloat(val) || 0);
          }}
          onKeyDown={handleKeyDown}
          className="h-9 w-16 text-right font-mono"
          placeholder="0"
          min="0"
        />
      </td>
      <td className="invoice-cell">
        <Input
          type="number"
          value={localItem.grossWeight || ''}
          onChange={(e) => handleChange('grossWeight', parseFloat(e.target.value) || 0)}
          onKeyDown={handleKeyDown}
          className="h-9 w-24 text-right font-mono"
          placeholder="0"
        />
      </td>
      <td className="invoice-cell text-right font-mono text-muted-foreground">
        {localItem.boxWeight.toFixed(2)} kg
      </td>
      <td className="invoice-cell">
        <Input
          type="number"
          value={localItem.benchesWeight || ''}
          onChange={(e) => handleChange('benchesWeight', parseFloat(e.target.value) || 0)}
          onKeyDown={handleKeyDown}
          className="h-9 w-20 text-right font-mono"
          placeholder="0"
        />
      </td>
      <td className="invoice-cell text-right font-mono font-medium text-foreground">
        {localItem.netWeight.toFixed(2)} kg
      </td>
      <td className="invoice-cell">
        <Input
          type="number"
          value={localItem.rate || ''}
          onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 0)}
          onKeyDown={handleKeyDown}
          className="h-9 w-20 text-right font-mono"
          placeholder="0"
        />
      </td>
      <td className="invoice-cell text-right font-mono font-semibold text-foreground">
        {formatCurrency(localItem.total)}
      </td>
      <td className="invoice-cell">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}