import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  vendor_id: string | null;
  product_id: string | null;
  quantity: number;
  gross_weight: number;
  box_weight: number;
  benches_weight: number;
  net_weight: number;
  rate: number;
  total: number;
}

export interface LooseInvoiceItem {
  id?: string;
  invoice_id?: string;
  vendor_id: string | null;
  loose_product_id: string | null;
  product_name: string;
  net_weight: number;
  weight_unit: 'kg' | 'g';
  rate: number;
  total: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string | null;
  date: string;
  subtotal: number;
  discount: number;
  other_charges: number;
  total: number;
  received_amount: number;
  payment_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  customers?: { name: string } | null;
}

export interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[];
  loose_invoice_items: LooseInvoiceItem[];
}

export function useInvoices() {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!company?.id,
  });

  const getNextInvoiceNumber = async () => {
    if (!company) return 'INV-001';
    
    const prefix = company.invoice_prefix || 'INV-';
    const nextNum = company.next_invoice_number || 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  };

  const createInvoice = useMutation({
    mutationFn: async ({ 
      invoice, 
      items,
      looseItems = []
    }: { 
      invoice: Omit<Invoice, 'id' | 'company_id' | 'created_at' | 'customers'>; 
      items: InvoiceItem[];
      looseItems?: LooseInvoiceItem[];
    }) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated');

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          company_id: company.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      if (items.length > 0) {
        const itemsWithInvoiceId = items.map(item => ({
          invoice_id: invoiceData.id,
          vendor_id: item.vendor_id,
          product_id: item.product_id,
          quantity: item.quantity,
          gross_weight: item.gross_weight,
          box_weight: item.box_weight,
          benches_weight: item.benches_weight,
          net_weight: item.net_weight,
          rate: item.rate,
          total: item.total,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsWithInvoiceId);

        if (itemsError) throw itemsError;
      }

      // Create loose invoice items
      if (looseItems.length > 0) {
        const looseItemsWithInvoiceId = looseItems.map(item => ({
          invoice_id: invoiceData.id,
          vendor_id: item.vendor_id,
          loose_product_id: item.loose_product_id,
          product_name: item.product_name,
          net_weight: item.net_weight,
          weight_unit: item.weight_unit,
          rate: item.rate,
          total: item.total,
        }));

        const { error: looseItemsError } = await supabase
          .from('loose_invoice_items')
          .insert(looseItemsWithInvoiceId);

        if (looseItemsError) throw looseItemsError;
      }

      // Create payment record if received_amount > 0
      if (invoice.received_amount && invoice.received_amount > 0) {
        await supabase
          .from('payments')
          .insert({
            company_id: company.id,
            invoice_id: invoiceData.id,
            customer_id: invoice.customer_id,
            amount: invoice.received_amount,
            payment_date: invoice.date,
            payment_method: invoice.payment_type === 'credit' ? 'credit' : invoice.payment_type === 'bank' ? 'bank_transfer' : 'cash',
            notes: `Payment received with invoice ${invoice.invoice_number}`,
            created_by: user.id,
          });
      }

      // Update next invoice number
      await supabase
        .from('companies')
        .update({ next_invoice_number: (company.next_invoice_number || 1) + 1 })
        .eq('id', company.id);

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      // Delete loose invoice items first
      await supabase
        .from('loose_invoice_items')
        .delete()
        .eq('invoice_id', id);

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete invoice: ' + error.message);
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ 
      id,
      invoice, 
      items,
      looseItems = []
    }: { 
      id: string;
      invoice: Omit<Invoice, 'id' | 'company_id' | 'created_at' | 'customers'>; 
      items: InvoiceItem[];
      looseItems?: LooseInvoiceItem[];
    }) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated');

      // Get old received_amount to track difference
      const { data: oldInvoice } = await supabase
        .from('invoices')
        .select('received_amount')
        .eq('id', id)
        .maybeSingle();

      const oldReceivedAmount = (oldInvoice?.received_amount as number) || 0;
      const newReceivedAmount = invoice.received_amount || 0;
      const paymentDifference = newReceivedAmount - oldReceivedAmount;

      // Update invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .update({
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          date: invoice.date,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          other_charges: invoice.other_charges,
          total: invoice.total,
          received_amount: newReceivedAmount,
          payment_type: invoice.payment_type,
          status: invoice.status,
          notes: invoice.notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      // Delete existing loose items
      await supabase
        .from('loose_invoice_items')
        .delete()
        .eq('invoice_id', id);

      // Create new invoice items
      if (items.length > 0) {
        const itemsWithInvoiceId = items.map(item => ({
          invoice_id: id,
          vendor_id: item.vendor_id,
          product_id: item.product_id,
          quantity: item.quantity,
          gross_weight: item.gross_weight,
          box_weight: item.box_weight,
          benches_weight: item.benches_weight,
          net_weight: item.net_weight,
          rate: item.rate,
          total: item.total,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsWithInvoiceId);

        if (itemsError) throw itemsError;
      }

      // Create new loose invoice items
      if (looseItems.length > 0) {
        const looseItemsWithInvoiceId = looseItems.map(item => ({
          invoice_id: id,
          vendor_id: item.vendor_id,
          loose_product_id: item.loose_product_id,
          product_name: item.product_name,
          net_weight: item.net_weight,
          weight_unit: item.weight_unit,
          rate: item.rate,
          total: item.total,
        }));

        const { error: looseItemsError } = await supabase
          .from('loose_invoice_items')
          .insert(looseItemsWithInvoiceId);

        if (looseItemsError) throw looseItemsError;
      }

      // Sync payment record with received_amount changes
      if (paymentDifference !== 0) {
        // Find existing auto-created payment for this invoice
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('id, amount')
          .eq('invoice_id', id)
          .like('notes', '%Payment received%invoice%');

        if (existingPayments && existingPayments.length > 0) {
          // Update the first auto-created payment with the new total received amount
          const existingPayment = existingPayments[0];
          if (newReceivedAmount > 0) {
            await supabase
              .from('payments')
              .update({
                amount: newReceivedAmount,
                payment_date: invoice.date,
                payment_method: invoice.payment_type === 'credit' ? 'credit' : invoice.payment_type === 'bank' ? 'bank_transfer' : 'cash',
              })
              .eq('id', existingPayment.id);
          } else {
            // Delete payment if received amount is now 0
            await supabase
              .from('payments')
              .delete()
              .eq('id', existingPayment.id);
          }
        } else if (newReceivedAmount > 0) {
          // No existing payment, create new one
          await supabase
            .from('payments')
            .insert({
              company_id: company.id,
              invoice_id: id,
              customer_id: invoice.customer_id,
              amount: newReceivedAmount,
              payment_date: invoice.date,
              payment_method: invoice.payment_type === 'credit' ? 'credit' : invoice.payment_type === 'bank' ? 'bank_transfer' : 'cash',
              notes: `Payment received for invoice ${invoice.invoice_number}`,
              created_by: user.id,
            });
        }
      }

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-details'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    },
  });

  const getInvoiceWithItems = async (invoiceId: string): Promise<InvoiceWithItems | null> => {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, customers(name)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) return null;

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) return null;

    const { data: looseItems, error: looseItemsError } = await supabase
      .from('loose_invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (looseItemsError) return null;

    return {
      ...invoice,
      invoice_items: items as InvoiceItem[],
      loose_invoice_items: (looseItems || []) as LooseInvoiceItem[],
    };
  };

  return {
    invoices,
    isLoading,
    getNextInvoiceNumber,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    updateInvoice,
    getInvoiceWithItems,
  };
}
