import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, Plus, Package, Edit, Trash, Loader2, Leaf } from 'lucide-react';
import { useProducts, Product } from '@/hooks/useProducts';
import { useLooseProducts, LooseProduct } from '@/hooks/useLooseProducts';
import { useUnits } from '@/hooks/useUnits';

export default function Products() {
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useProducts();
  const { looseProducts, isLoading: isLooseLoading, addLooseProduct, updateLooseProduct, deleteLooseProduct } = useLooseProducts();
  const { units } = useUnits();
  
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    default_rate: 0,
    unit_id: '',
    stock: 0,
    box_weight: 0,
    box_weight_unit_id: '',
  });

  // Loose products state
  const [isLooseDialogOpen, setIsLooseDialogOpen] = useState(false);
  const [isEditLooseDialogOpen, setIsEditLooseDialogOpen] = useState(false);
  const [editingLooseProduct, setEditingLooseProduct] = useState<LooseProduct | null>(null);
  const [newLooseProduct, setNewLooseProduct] = useState({
    name: '',
    default_rate: 0,
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLooseProducts = looseProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) {
      return;
    }
    await addProduct.mutateAsync({
      name: newProduct.name,
      default_rate: newProduct.default_rate,
      unit_id: newProduct.unit_id || null,
      stock: newProduct.stock,
      box_weight: newProduct.box_weight,
      box_weight_unit_id: newProduct.box_weight_unit_id || null,
    });
    setIsDialogOpen(false);
    setNewProduct({ name: '', default_rate: 0, unit_id: '', stock: 0, box_weight: 0, box_weight_unit_id: '' });
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    await updateProduct.mutateAsync({
      id: editingProduct.id,
      name: editingProduct.name,
      default_rate: editingProduct.default_rate,
      unit_id: editingProduct.unit_id,
      stock: editingProduct.stock,
      box_weight: editingProduct.box_weight,
      box_weight_unit_id: editingProduct.box_weight_unit_id,
    });
    setIsEditDialogOpen(false);
    setEditingProduct(null);
  };

  const getUnitSymbol = (unitId: string | null) => {
    if (!unitId) return 'kg';
    const unit = units.find(u => u.id === unitId);
    return unit?.symbol || 'kg';
  };

  // Loose products handlers
  const handleAddLooseProduct = async () => {
    if (!newLooseProduct.name) {
      return;
    }
    await addLooseProduct.mutateAsync({
      name: newLooseProduct.name,
      default_rate: newLooseProduct.default_rate,
    });
    setIsLooseDialogOpen(false);
    setNewLooseProduct({ name: '', default_rate: 0 });
  };

  const handleEditLooseClick = (product: LooseProduct) => {
    setEditingLooseProduct(product);
    setIsEditLooseDialogOpen(true);
  };

  const handleUpdateLooseProduct = async () => {
    if (!editingLooseProduct) return;
    await updateLooseProduct.mutateAsync({
      id: editingLooseProduct.id,
      name: editingLooseProduct.name,
      default_rate: editingLooseProduct.default_rate,
    });
    setIsEditLooseDialogOpen(false);
    setEditingLooseProduct(null);
  };

  if (isLoading || isLooseLoading) {
    return (
      <DashboardLayout title="Products" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Products" subtitle="Manage your product catalog">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Regular and Loose Products */}
        <Tabs defaultValue="regular" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="regular" className="gap-2">
              <Package className="w-4 h-4" />
              Regular Products
            </TabsTrigger>
            <TabsTrigger value="loose" className="gap-2">
              <Leaf className="w-4 h-4" />
              Loose Products
            </TabsTrigger>
          </TabsList>

          {/* Regular Products Tab */}
          <TabsContent value="regular" className="mt-6">
            <Card className="shadow-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Regular Products</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>
                        Add a new product to your catalog.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rate">Default Rate (₹)</Label>
                          <Input
                            id="rate"
                            type="number"
                            value={newProduct.default_rate || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, default_rate: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unit">Unit</Label>
                          <Select 
                            value={newProduct.unit_id} 
                            onValueChange={(v) => setNewProduct({ ...newProduct, unit_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="box_weight">Box Weight</Label>
                          <Input
                            id="box_weight"
                            type="number"
                            value={newProduct.box_weight || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, box_weight: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="box_unit">Box Weight Unit</Label>
                          <Select 
                            value={newProduct.box_weight_unit_id} 
                            onValueChange={(v) => setNewProduct({ ...newProduct, box_weight_unit_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddProduct} disabled={addProduct.isPending}>
                          {addProduct.isPending ? 'Adding...' : 'Add Product'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              {filteredProducts.length === 0 ? (
                <CardContent className="py-12 text-center text-muted-foreground">
                  {products.length === 0 ? (
                    <>
                      <p className="mb-2">No products yet</p>
                      <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                        Add Your First Product
                      </Button>
                    </>
                  ) : (
                    <p>No products found matching your search.</p>
                  )}
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="invoice-cell text-left font-semibold text-muted-foreground">Product</th>
                        <th className="invoice-cell text-right font-semibold text-muted-foreground">Default Rate</th>
                        <th className="invoice-cell text-center font-semibold text-muted-foreground">Unit</th>
                        <th className="invoice-cell text-right font-semibold text-muted-foreground">Box Weight</th>
                        <th className="invoice-cell text-right font-semibold text-muted-foreground">Stock</th>
                        <th className="invoice-cell text-right font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="data-table-row">
                          <td className="invoice-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="w-5 h-5 text-primary" />
                              </div>
                              <span className="font-medium">{product.name}</span>
                            </div>
                          </td>
                          <td className="invoice-cell text-right font-mono font-semibold">
                            {formatCurrency(Number(product.default_rate))}/{getUnitSymbol(product.unit_id)}
                          </td>
                          <td className="invoice-cell text-center text-muted-foreground">
                            {getUnitSymbol(product.unit_id)}
                          </td>
                          <td className="invoice-cell text-right font-mono">
                            {Number(product.box_weight || 0).toFixed(2)} {getUnitSymbol(product.box_weight_unit_id)}
                          </td>
                          <td className="invoice-cell text-right font-mono">
                            {Number(product.stock).toLocaleString()} {getUnitSymbol(product.unit_id)}
                          </td>
                          <td className="invoice-cell">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditClick(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteProduct.mutate(product.id)}
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
          </TabsContent>

          {/* Loose Products Tab */}
          <TabsContent value="loose" className="mt-6">
            <Card className="shadow-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Loose Products</CardTitle>
                <Dialog open={isLooseDialogOpen} onOpenChange={setIsLooseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Loose Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Loose Product</DialogTitle>
                      <DialogDescription>
                        Add a loose product (sold by net weight only).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="loose-name">Product Name *</Label>
                        <Input
                          id="loose-name"
                          value={newLooseProduct.name}
                          onChange={(e) => setNewLooseProduct({ ...newLooseProduct, name: e.target.value })}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loose-rate">Default Rate (₹/kg)</Label>
                        <Input
                          id="loose-rate"
                          type="number"
                          value={newLooseProduct.default_rate || ''}
                          onChange={(e) => setNewLooseProduct({ ...newLooseProduct, default_rate: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsLooseDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddLooseProduct} disabled={addLooseProduct.isPending}>
                          {addLooseProduct.isPending ? 'Adding...' : 'Add Product'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              {filteredLooseProducts.length === 0 ? (
                <CardContent className="py-12 text-center text-muted-foreground">
                  {looseProducts.length === 0 ? (
                    <>
                      <p className="mb-2">No loose products yet</p>
                      <Button variant="outline" onClick={() => setIsLooseDialogOpen(true)}>
                        Add Your First Loose Product
                      </Button>
                    </>
                  ) : (
                    <p>No loose products found matching your search.</p>
                  )}
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="invoice-cell text-left font-semibold text-muted-foreground">Product</th>
                        <th className="invoice-cell text-right font-semibold text-muted-foreground">Default Rate (₹/kg)</th>
                        <th className="invoice-cell text-right font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLooseProducts.map((product) => (
                        <tr key={product.id} className="data-table-row">
                          <td className="invoice-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-green-600" />
                              </div>
                              <span className="font-medium">{product.name}</span>
                            </div>
                          </td>
                          <td className="invoice-cell text-right font-mono font-semibold">
                            {formatCurrency(Number(product.default_rate))}/kg
                          </td>
                          <td className="invoice-cell">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditLooseClick(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteLooseProduct.mutate(product.id)}
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
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product details.
              </DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-rate">Default Rate (₹)</Label>
                    <Input
                      id="edit-rate"
                      type="number"
                      value={editingProduct.default_rate || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, default_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">Unit</Label>
                    <Select 
                      value={editingProduct.unit_id || ''} 
                      onValueChange={(v) => setEditingProduct({ ...editingProduct, unit_id: v || null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-box_weight">Box Weight</Label>
                    <Input
                      id="edit-box_weight"
                      type="number"
                      value={editingProduct.box_weight || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, box_weight: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-box_unit">Box Weight Unit</Label>
                    <Select 
                      value={editingProduct.box_weight_unit_id || ''} 
                      onValueChange={(v) => setEditingProduct({ ...editingProduct, box_weight_unit_id: v || null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProduct} disabled={updateProduct.isPending}>
                    {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Loose Product Dialog */}
        <Dialog open={isEditLooseDialogOpen} onOpenChange={setIsEditLooseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Loose Product</DialogTitle>
              <DialogDescription>
                Update loose product details.
              </DialogDescription>
            </DialogHeader>
            {editingLooseProduct && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-loose-name">Product Name *</Label>
                  <Input
                    id="edit-loose-name"
                    value={editingLooseProduct.name}
                    onChange={(e) => setEditingLooseProduct({ ...editingLooseProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-loose-rate">Default Rate (₹/kg)</Label>
                  <Input
                    id="edit-loose-rate"
                    type="number"
                    value={editingLooseProduct.default_rate || ''}
                    onChange={(e) => setEditingLooseProduct({ ...editingLooseProduct, default_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsEditLooseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateLooseProduct} disabled={updateLooseProduct.isPending}>
                    {updateLooseProduct.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
