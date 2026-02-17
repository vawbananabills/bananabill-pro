import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface VendorReceiptItem {
    id?: string;
    receipt_id?: string;
    item_name: string;
    qty: number;
    gross_weight: number;
    net_weight: number;
    rate: number;
    amount: number;
}

export interface VendorReceipt {
    id: string;
    company_id: string;
    vendor_id: string;
    receipt_number: string;
    date: string;
    vehicle_number: string | null;
    notes: string | null;
    payment_mode: string;
    amount_received: number;
    cooli: number;
    rent: number;
    padi: number;
    loading_charge: number;
    commission_percent: number;
    first_total: number;
    final_total: number;
    created_at: string;
    vendors?: { name: string } | null;
}

export interface VendorReceiptWithItems extends VendorReceipt {
    items: VendorReceiptItem[];
}

export function useVendorReceipts() {
    const { company, user } = useAuth();
    const queryClient = useQueryClient();

    const { data: receipts = [], isLoading } = useQuery({
        queryKey: ['vendor-receipts', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data, error } = await supabase
                .from('vendor_receipts' as any)
                .select('*, vendors(name)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as VendorReceipt[];
        },
        enabled: !!company?.id,
    });

    const createReceipt = useMutation({
        mutationFn: async ({
            receipt,
            items
        }: {
            receipt: Omit<VendorReceipt, 'id' | 'company_id' | 'created_at' | 'vendors'>;
            items: Omit<VendorReceiptItem, 'id' | 'receipt_id'>[];
        }) => {
            if (!company?.id || !user?.id) throw new Error('Not authenticated');

            // 1. Create receipt
            const { data: receiptData, error: receiptError } = await supabase
                .from('vendor_receipts' as any)
                .insert({
                    ...receipt,
                    company_id: company.id,
                    created_by: user.id,
                })
                .select()
                .single();

            if (receiptError) throw receiptError;

            // 2. Create items
            if (items.length > 0) {
                const itemsWithReceiptId = items.map(item => ({
                    ...item,
                    receipt_id: receiptData.id,
                }));

                const { error: itemsError } = await supabase
                    .from('vendor_receipt_items' as any)
                    .insert(itemsWithReceiptId);

                if (itemsError) throw itemsError;
            }

            return receiptData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-receipts'] });
            toast.success('Vendor receipt saved successfully');
        },
        onError: (error) => {
            toast.error('Failed to create receipt: ' + error.message);
        },
    });

    const updateReceipt = useMutation({
        mutationFn: async ({
            id,
            receipt,
            items
        }: {
            id: string;
            receipt: Omit<VendorReceipt, 'id' | 'company_id' | 'created_at' | 'vendors'>;
            items: Omit<VendorReceiptItem, 'id' | 'receipt_id'>[];
        }) => {
            if (!company?.id) throw new Error('Not authenticated');

            // 1. Update receipt
            const { error: receiptError } = await supabase
                .from('vendor_receipts' as any)
                .update(receipt)
                .eq('id', id);

            if (receiptError) throw receiptError;

            // 2. Delete old items
            const { error: deleteError } = await supabase
                .from('vendor_receipt_items' as any)
                .delete()
                .eq('receipt_id', id);

            if (deleteError) throw deleteError;

            // 3. Create new items
            if (items.length > 0) {
                const itemsWithReceiptId = items.map(item => ({
                    ...item,
                    receipt_id: id,
                }));

                const { error: itemsError } = await supabase
                    .from('vendor_receipt_items' as any)
                    .insert(itemsWithReceiptId);

                if (itemsError) throw itemsError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-receipts'] });
            toast.success('Vendor receipt updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update receipt: ' + error.message);
        },
    });

    const deleteReceipt = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('vendor_receipts' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-receipts'] });
            toast.success('Vendor receipt deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete receipt: ' + error.message);
        },
    });

    const getReceiptWithItems = async (id: string): Promise<VendorReceiptWithItems | null> => {
        const { data: receipt, error: receiptError } = await supabase
            .from('vendor_receipts' as any)
            .select('*, vendors(name)')
            .eq('id', id)
            .single();

        if (receiptError) return null;

        const { data: items, error: itemsError } = await supabase
            .from('vendor_receipt_items' as any)
            .select('*')
            .eq('receipt_id', id);

        if (itemsError) return null;

        return {
            ...receipt,
            items: items as VendorReceiptItem[],
        } as VendorReceiptWithItems;
    };

    return {
        receipts,
        isLoading,
        createReceipt,
        updateReceipt,
        deleteReceipt,
        getReceiptWithItems,
    };
}
