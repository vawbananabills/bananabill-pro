import React, { useState } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCashDaybook, CashDaybookType } from '@/hooks/useCashDaybook';

export default function CashDaybook() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
    const [editingEntry, setEditingEntry] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        person_name: '',
        vehicle_number: '',
        amount: '',
        type: 'cash_in' as CashDaybookType,
        payment_mode: 'Cash' as 'Cash' | 'UPI' | 'Bank',
        notes: '',
    });

    const { entries, isLoading, createEntry, updateEntry, deleteEntry } = useCashDaybook();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const entryData = {
            date: formData.date,
            person_name: formData.person_name,
            vehicle_number: formData.vehicle_number || null,
            amount: parseFloat(formData.amount) || 0,
            type: formData.type,
            payment_mode: formData.payment_mode,
            notes: formData.notes || null,
        };

        if (editingEntry) {
            await updateEntry.mutateAsync({ id: editingEntry, ...entryData });
        } else {
            await createEntry.mutateAsync(entryData);
        }

        resetForm();
    };

    const resetForm = () => {
        setFormData({
            date: format(new Date(), 'yyyy-MM-dd'),
            person_name: '',
            vehicle_number: '',
            amount: '',
            type: 'cash_in',
            payment_mode: 'Cash',
            notes: '',
        });
        setEditingEntry(null);
        setDialogOpen(false);
    };

    const handleEdit = (entry: any) => {
        setFormData({
            date: entry.date,
            person_name: entry.person_name,
            vehicle_number: entry.vehicle_number || '',
            amount: entry.amount?.toString() || '',
            type: entry.type,
            payment_mode: entry.payment_mode || 'Cash',
            notes: entry.notes || '',
        });
        setEditingEntry(entry.id);
        setDialogOpen(true);
    };

    const handleDelete = async () => {
        if (entryToDelete) {
            await deleteEntry.mutateAsync(entryToDelete);
            setEntryToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    const filteredEntries = entries.filter(
        (entry) =>
            entry.person_name?.toLowerCase().includes(search.toLowerCase()) ||
            entry.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
            entry.notes?.toLowerCase().includes(search.toLowerCase())
    );

    const totalIn = filteredEntries
        .filter((e) => e.type === 'cash_in')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalOut = filteredEntries
        .filter((e) => e.type === 'cash_out')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    const netCash = totalIn - totalOut;

    return (
        <DashboardLayout title="Cash Daybook" subtitle="Track daily cash collection and payments">
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        if (!open) resetForm();
                        setDialogOpen(open);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Record
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingEntry ? 'Edit Record' : 'Add Cash Record'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Date *</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type *</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(value: CashDaybookType) => setFormData({ ...formData, type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash_in">Cash Collection (IN)</SelectItem>
                                                <SelectItem value="cash_out">Cash Payment (OUT)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="person_name">Person Name *</Label>
                                    <Input
                                        id="person_name"
                                        value={formData.person_name}
                                        onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                                        placeholder="Enter name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="vehicle_number">Vehicle Number</Label>
                                        <div className="relative">
                                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="vehicle_number"
                                                value={formData.vehicle_number}
                                                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                                                placeholder="MH 12 AB 1234"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount *</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            required
                                            className="font-bold text-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Mode</Label>
                                        <Select
                                            value={formData.payment_mode}
                                            onValueChange={(value: 'Cash' | 'UPI' | 'Bank') =>
                                                setFormData({ ...formData, payment_mode: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="Bank">Bank</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Optional notes..."
                                        rows={2}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={createEntry.isPending || updateEntry.isPending}>
                                        {(createEntry.isPending || updateEntry.isPending) ? 'Saving...' : (editingEntry ? 'Update Record' : 'Save Record')}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-50/50 border-emerald-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                <ArrowDownCircle className="w-4 h-4" /> Total Collection (IN)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-emerald-700">₹{totalIn.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-rose-50/50 border-rose-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-rose-600 flex items-center gap-2">
                                <ArrowUpCircle className="w-4 h-4" /> Total Payments (OUT)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-rose-700">₹{totalOut.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className={cn(
                        "border-primary/10",
                        netCash >= 0 ? "bg-primary/5" : "bg-amber-50/50"
                    )}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-primary">
                                Net Cash Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={cn(
                                "text-2xl font-bold",
                                netCash >= 0 ? "text-primary" : "text-amber-700"
                            )}>₹{netCash.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Bar - Prominent */}
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <Input
                        placeholder="Search by name, vehicle, or notes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 h-12 text-base border-2 border-primary/20 focus:border-primary bg-background shadow-sm rounded-xl"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Mobile Grid View */}
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading daybook entries...</div>
                ) : filteredEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No records found</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredEntries.map((entry) => (
                            <Card key={entry.id} className={cn(
                                "overflow-hidden border-l-4",
                                entry.type === 'cash_in' ? "border-l-emerald-500" : "border-l-rose-500"
                            )}>
                                <CardContent className="p-4 space-y-3">
                                    {/* Top row: Name + Amount */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground truncate">{entry.person_name}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(entry.date), 'dd MMM yyyy')}</p>
                                        </div>
                                        <div className={cn(
                                            "text-right font-bold text-lg tabular-nums whitespace-nowrap",
                                            entry.type === 'cash_in' ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {entry.type === 'cash_in' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Info row */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {entry.type === 'cash_in' ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 uppercase text-[10px]">IN</Badge>
                                        ) : (
                                            <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 uppercase text-[10px]">OUT</Badge>
                                        )}
                                        <Badge variant="outline" className="text-[10px]">{entry.payment_mode || 'Cash'}</Badge>
                                        {entry.vehicle_number && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Truck className="w-3 h-3" />
                                                {entry.vehicle_number}
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {entry.notes && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-1 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                            onClick={() => handleEdit(entry)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            <span className="text-xs">Edit</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                            onClick={() => {
                                                setEntryToDelete(entry.id);
                                                setDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span className="text-xs">Delete</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Record</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this cash record? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}
