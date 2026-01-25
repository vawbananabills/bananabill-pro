import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, Scale, Loader2 } from 'lucide-react';
import { useUnits, Unit } from '@/hooks/useUnits';

export default function Units() {
  const { units, isLoading, addUnit, updateUnit, deleteUnit } = useUnits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [newUnit, setNewUnit] = useState({
    name: '',
    symbol: '',
    is_default: false,
    weight_value: 1,
  });

  const handleAddUnit = async () => {
    if (!newUnit.name || !newUnit.symbol) {
      return;
    }
    await addUnit.mutateAsync(newUnit);
    setIsDialogOpen(false);
    setNewUnit({ name: '', symbol: '', is_default: false, weight_value: 1 });
  };

  const handleEditClick = (unit: Unit) => {
    setEditingUnit(unit);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUnit = async () => {
    if (!editingUnit) return;
    await updateUnit.mutateAsync({
      id: editingUnit.id,
      name: editingUnit.name,
      symbol: editingUnit.symbol,
      weight_value: editingUnit.weight_value,
      is_default: editingUnit.is_default,
    });
    setIsEditDialogOpen(false);
    setEditingUnit(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Units" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Units" subtitle="Manage measurement units">
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Custom Units</CardTitle>
                <CardDescription>
                  Define the units of measurement used in your invoices
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Unit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Unit</DialogTitle>
                    <DialogDescription>
                      Create a new unit of measurement.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Unit Name *</Label>
                      <Input
                        id="name"
                        value={newUnit.name}
                        onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                        placeholder="e.g., Kilogram"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol *</Label>
                      <Input
                        id="symbol"
                        value={newUnit.symbol}
                        onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                        placeholder="e.g., kg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight_value">Weight Value (kg)</Label>
                      <Input
                        id="weight_value"
                        type="number"
                        value={newUnit.weight_value || ''}
                        onChange={(e) => setNewUnit({ ...newUnit, weight_value: parseFloat(e.target.value) || 1 })}
                        placeholder="e.g., 5 (1 crate = 5kg)"
                      />
                      <p className="text-xs text-muted-foreground">
                        How many kg does 1 unit weigh? (e.g., 1 crate = 5kg)
                      </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddUnit} disabled={addUnit.isPending}>
                        {addUnit.isPending ? 'Adding...' : 'Add Unit'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No units yet</p>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                  Add Your First Unit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {units.map((unit) => (
                  <div 
                    key={unit.id} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{unit.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Symbol: {unit.symbol} • Weight: {unit.weight_value || 1} kg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unit.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditClick(unit)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!unit.is_default && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteUnit.mutate(unit.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Unit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
              <DialogDescription>
                Update unit details.
              </DialogDescription>
            </DialogHeader>
            {editingUnit && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Unit Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingUnit.name}
                    onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                    placeholder="e.g., Kilogram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-symbol">Symbol *</Label>
                  <Input
                    id="edit-symbol"
                    value={editingUnit.symbol}
                    onChange={(e) => setEditingUnit({ ...editingUnit, symbol: e.target.value })}
                    placeholder="e.g., kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight_value">Weight Value (kg)</Label>
                  <Input
                    id="edit-weight_value"
                    type="number"
                    value={editingUnit.weight_value || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, weight_value: parseFloat(e.target.value) || 1 })}
                    placeholder="e.g., 5 (1 crate = 5kg)"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many kg does 1 unit weigh? (e.g., 1 crate = 5kg)
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUnit} disabled={updateUnit.isPending}>
                    {updateUnit.isPending ? 'Saving...' : 'Save Changes'}
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