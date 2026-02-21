import React, { useState } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

                                <div className="grid grid-cols-2 gap-4">
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

                {/* Search & Filters */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, vehicle, or notes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Entries Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Person Name</TableHead>
                                    <TableHead>Vehicle #</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Loading daybook entries...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEntries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No records found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEntries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-sm font-medium">
                                                {format(new Date(entry.date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                {entry.type === 'cash_in' ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 uppercase text-[10px]">IN</Badge>
                                                ) : (
                                                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 uppercase text-[10px]">OUT</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold">{entry.person_name}</TableCell>
                                            <TableCell>
                                                {entry.vehicle_number ? (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Truck className="w-3 h-3" />
                                                        {entry.vehicle_number}
                                                    </div>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-bold tabular-nums",
                                                entry.type === 'cash_in' ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {entry.type === 'cash_in' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                                {entry.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                                                        onClick={() => handleEdit(entry)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/5"
                                                        onClick={() => {
                                                            setEntryToDelete(entry.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

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
