import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { Search, Plus, Phone, Mail, MapPin, MoreVertical, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { PartyStatementDialog } from '@/components/reports/PartyStatementDialog';

export default function Customers() {
  const { customers, isLoading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    opening_balance: '',
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      return;
    }
    await addCustomer.mutateAsync({
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      email: newCustomer.email || null,
      address: newCustomer.address || null,
      opening_balance: newCustomer.opening_balance ? parseFloat(newCustomer.opening_balance) : 0,
    });
    setIsDialogOpen(false);
    setNewCustomer({ name: '', phone: '', email: '', address: '', opening_balance: '' });
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer || !newCustomer.name) return;
    await updateCustomer.mutateAsync({
      id: editingCustomer.id,
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      email: newCustomer.email || null,
      address: newCustomer.address || null,
      opening_balance: newCustomer.opening_balance ? parseFloat(newCustomer.opening_balance) : 0,
    });
    setEditingCustomer(null);
    setIsDialogOpen(false);
    setNewCustomer({ name: '', phone: '', email: '', address: '', opening_balance: '' });
  };

  const handleDeleteCustomer = async () => {
    if (deleteCustomerId) {
      await deleteCustomer.mutateAsync(deleteCustomerId);
      setDeleteCustomerId(null);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      opening_balance: customer.opening_balance?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    setNewCustomer({ name: '', phone: '', email: '', address: '', opening_balance: '' });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Customers" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customers" subtitle="Manage your customer database">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) closeDialog();
                else setIsDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                      {editingCustomer ? 'Update customer details.' : 'Add a new customer to your database.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Customer Name *</Label>
                      <Input
                        id="name"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opening_balance">Opening Balance</Label>
                      <Input
                        id="opening_balance"
                        type="number"
                        step="0.01"
                        value={newCustomer.opening_balance}
                        onChange={(e) => setNewCustomer({ ...newCustomer, opening_balance: e.target.value })}
                        placeholder="0.00 (positive = receivable, negative = advance)"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={closeDialog}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={editingCustomer ? handleEditCustomer : handleAddCustomer} 
                        disabled={addCustomer.isPending || updateCustomer.isPending}
                      >
                        {(addCustomer.isPending || updateCustomer.isPending) ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Customer Grid */}
        {filteredCustomers.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              {customers.length === 0 ? (
                <>
                  <p className="mb-2">No customers yet</p>
                  <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                    Add Your First Customer
                  </Button>
                </>
              ) : (
                <p>No customers found matching your search.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <Card 
                key={customer.id} 
                className="shadow-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCustomerId(customer.id);
                  setIsStatementOpen(true);
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteCustomerId(customer.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {customer.address}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <Badge 
                      variant="secondary"
                      className={
                        Number(customer.balance) > 0 ? 'badge-pending' : 
                        Number(customer.balance) < 0 ? 'badge-paid' : 
                        'bg-muted text-muted-foreground'
                      }
                    >
                      {Number(customer.balance) > 0 ? 'Receivable: ' : Number(customer.balance) < 0 ? 'Advance: ' : ''}
                      {formatCurrency(Number(customer.balance))}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <PartyStatementDialog
          open={isStatementOpen}
          onOpenChange={setIsStatementOpen}
          initialCustomerId={selectedCustomerId}
        />

        <AlertDialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer and may affect related invoices and payments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCustomer}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
