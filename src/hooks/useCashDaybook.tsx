import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type CashDaybookType = 'cash_in' | 'cash_out';

export interface CashDaybookEntry {
    id: string;
    company_id: string;
    date: string;
    person_name: string;
    vehicle_number: string | null;
    amount: number;
    type: CashDaybookType;
    payment_mode?: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
}

export function useCashDaybook() {
    const { company, user } = useAuth();
    const queryClient = useQueryClient();

    const { data: entries = [], isLoading } = useQuery({
        queryKey: ['cash-daybook', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabase
                .from('cash_daybook')
                .select('*')
                .eq('company_id', company.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as CashDaybookEntry[];
        },
        enabled: !!company?.id,
    });

    const createEntry = useMutation({
        mutationFn: async (entry: Omit<CashDaybookEntry, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
            if (!company?.id) throw new Error('No company found');

            const { data, error } = await supabase
                .from('cash_daybook')
                .insert({
                    ...entry,
                    company_id: company.id,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-daybook'] });
            toast.success('Entry recorded successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to record entry: ' + error.message);
        },
    });

    const updateEntry = useMutation({
        mutationFn: async ({ id, ...entry }: Partial<CashDaybookEntry> & { id: string }) => {
            const { data, error } = await supabase
                .from('cash_daybook')
                .update(entry)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-daybook'] });
            toast.success('Entry updated successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to update entry: ' + error.message);
        },
    });

    const deleteEntry = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('cash_daybook')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-daybook'] });
            toast.success('Entry deleted successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to delete entry: ' + error.message);
        },
    });

    return {
        entries,
        isLoading,
        createEntry,
        updateEntry,
        deleteEntry,
    };
}
