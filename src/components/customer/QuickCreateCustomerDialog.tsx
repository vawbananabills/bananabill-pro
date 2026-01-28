import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCustomers } from '@/hooks/useCustomers';

interface QuickCreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCustomerCreated?: (customerId: string) => void;
}

export function QuickCreateCustomerDialog({
  open,
  onOpenChange,
  initialName = '',
  onCustomerCreated,
}: QuickCreateCustomerDialogProps) {
  const { addCustomer } = useCustomers();
  const [formData, setFormData] = useState({
    name: initialName,
    phone: '',
    email: '',
    address: '',
    opening_balance: '',
  });

  // Update form when initialName changes
  useEffect(() => {
    if (initialName) {
      setFormData(prev => ({ ...prev, name: initialName }));
    }
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      const result = await addCustomer.mutateAsync({
        name: formData.name.trim(),
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      });

      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        opening_balance: '',
      });

      onOpenChange(false);
      
      if (onCustomerCreated && result?.id) {
        onCustomerCreated(result.id);
      }
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Customer name"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening_balance">Opening Balance (₹)</Label>
            <Input
              id="opening_balance"
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Customer address"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addCustomer.isPending}>
              {addCustomer.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
