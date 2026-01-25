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
import { Search, Plus, Phone, Mail, MapPin, MoreVertical, Truck, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useVendors, Vendor } from '@/hooks/useVendors';
import { VendorStatementDialog } from '@/components/reports/VendorStatementDialog';

export default function Vendors() {
  const { vendors, isLoading, addVendor, updateVendor, deleteVendor } = useVendors();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    opening_balance: '',
  });

  const filteredVendors = vendors.filter(v =>
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

  const handleAddVendor = async () => {
    if (!newVendor.name) {
      return;
    }
    await addVendor.mutateAsync({
      name: newVendor.name,
      phone: newVendor.phone || null,
      email: newVendor.email || null,
      address: newVendor.address || null,
      opening_balance: newVendor.opening_balance ? parseFloat(newVendor.opening_balance) : 0,
    });
    setIsDialogOpen(false);
    setNewVendor({ name: '', phone: '', email: '', address: '', opening_balance: '' });
  };

  const handleEditVendor = async () => {
    if (!editingVendor || !newVendor.name) return;
    await updateVendor.mutateAsync({
      id: editingVendor.id,
      name: newVendor.name,
      phone: newVendor.phone || null,
      email: newVendor.email || null,
      address: newVendor.address || null,
      opening_balance: newVendor.opening_balance ? parseFloat(newVendor.opening_balance) : 0,
    });
    setEditingVendor(null);
    setIsDialogOpen(false);
    setNewVendor({ name: '', phone: '', email: '', address: '', opening_balance: '' });
  };

  const handleDeleteVendor = async () => {
    if (deleteVendorId) {
      await deleteVendor.mutateAsync(deleteVendorId);
      setDeleteVendorId(null);
    }
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setNewVendor({
      name: vendor.name,
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      opening_balance: vendor.opening_balance?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingVendor(null);
    setNewVendor({ name: '', phone: '', email: '', address: '', opening_balance: '' });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Vendors" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendors" subtitle="Manage your supplier database">
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
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                    <DialogDescription>
                      {editingVendor ? 'Update vendor details.' : 'Add a new vendor/supplier to your database.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Vendor Name *</Label>
                      <Input
                        id="name"
                        value={newVendor.name}
                        onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                        placeholder="Enter vendor name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={newVendor.phone}
                        onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newVendor.email}
                        onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={newVendor.address}
                        onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opening_balance">Opening Balance</Label>
                      <Input
                        id="opening_balance"
                        type="number"
                        step="0.01"
                        value={newVendor.opening_balance}
                        onChange={(e) => setNewVendor({ ...newVendor, opening_balance: e.target.value })}
                        placeholder="0.00 (positive = payable, negative = advance)"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={closeDialog}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={editingVendor ? handleEditVendor : handleAddVendor} 
                        disabled={addVendor.isPending || updateVendor.isPending}
                      >
                        {(addVendor.isPending || updateVendor.isPending) ? 'Saving...' : (editingVendor ? 'Update Vendor' : 'Add Vendor')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Grid */}
        {filteredVendors.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              {vendors.length === 0 ? (
                <>
                  <p className="mb-2">No vendors yet</p>
                  <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                    Add Your First Vendor
                  </Button>
                </>
              ) : (
                <p>No vendors found matching your search.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => (
              <Card 
                key={vendor.id} 
                className="shadow-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedVendorId(vendor.id);
                  setIsStatementOpen(true);
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Truck className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{vendor.name}</h3>
                      </div>
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
                        <DropdownMenuItem onClick={() => openEditDialog(vendor)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteVendorId(vendor.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {vendor.phone}
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {vendor.email}
                      </div>
                    )}
                    {vendor.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {vendor.address}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <Badge 
                      variant="secondary"
                      className={
                        Number(vendor.balance) > 0 ? 'badge-credit' : 
                        Number(vendor.balance) < 0 ? 'badge-paid' : 
                        'bg-muted text-muted-foreground'
                      }
                    >
                      {Number(vendor.balance) > 0 ? 'Payable: ' : Number(vendor.balance) < 0 ? 'Advance: ' : ''}
                      {formatCurrency(Number(vendor.balance))}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <VendorStatementDialog
          open={isStatementOpen}
          onOpenChange={setIsStatementOpen}
          initialVendorId={selectedVendorId}
        />

        <AlertDialog open={!!deleteVendorId} onOpenChange={() => setDeleteVendorId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the vendor and may affect related purchases.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteVendor}
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
