import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceDetails {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_balance: number;
  subtotal: number;
  discount: number;
  other_charges: number;
  total: number;
  received_amount: number;
  payment_type: string;
  status: string;
  notes: string | null;
  items: {
    vendor_name: string;
    product_name: string;
    quantity: number;
    gross_weight: number;
    box_weight: number;
    benches_weight: number;
    net_weight: number;
    rate: number;
    total: number;
  }[];
  loose_items: {
    vendor_name: string;
    product_name: string;
    net_weight: number;
    weight_unit: 'kg' | 'g';
    rate: number;
    total: number;
  }[];
}

export function useInvoiceDetails(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice-details', invoiceId],
    queryFn: async (): Promise<InvoiceDetails | null> => {
      if (!invoiceId) return null;

      // Fetch invoice with customer
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, customers(id, name)')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch invoice items with vendor and product names
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*, vendors(name), products(name)')
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      // Fetch loose invoice items with vendor names
      const { data: looseItems, error: looseItemsError } = await supabase
        .from('loose_invoice_items')
        .select('*, vendors(name)')
        .eq('invoice_id', invoiceId);

      if (looseItemsError) throw looseItemsError;

      // Calculate customer's previous balance (balance before this invoice)
      let previousBalance = 0;
      const customerId = invoice.customers?.id;
      
      if (customerId) {
        // Get all invoices BEFORE this invoice's date (or same date but created earlier)
        const { data: previousInvoices } = await supabase
          .from('invoices')
          .select('total, received_amount, created_at')
          .eq('customer_id', customerId)
          .lt('created_at', invoice.created_at);

        // Get all payments BEFORE this invoice
        const { data: previousPayments } = await supabase
          .from('payments')
          .select('amount, created_at')
          .eq('customer_id', customerId)
          .lt('created_at', invoice.created_at);

        // Get all adjustments BEFORE this invoice
        const { data: previousAdjustments } = await supabase
          .from('party_adjustments')
          .select('amount, type, created_at')
          .eq('customer_id', customerId)
          .lt('created_at', invoice.created_at);

        // Calculate previous balance: invoices (debit) - payments (credit) +/- adjustments
        const invoiceTotal = (previousInvoices || []).reduce((sum, inv) => 
          sum + (Number(inv.total) || 0) - (Number(inv.received_amount) || 0), 0);
        
        const paymentTotal = (previousPayments || []).reduce((sum, pay) => 
          sum + (Number(pay.amount) || 0), 0);
        
        const adjustmentTotal = (previousAdjustments || []).reduce((sum, adj) => {
          const amount = Number(adj.amount) || 0;
          return adj.type === 'debit' ? sum + amount : sum - amount;
        }, 0);

        previousBalance = invoiceTotal - paymentTotal + adjustmentTotal;
      }

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        customer_name: invoice.customers?.name || 'Unknown',
        customer_balance: previousBalance,
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount),
        other_charges: Number(invoice.other_charges),
        total: Number(invoice.total),
        received_amount: Number(invoice.received_amount) || 0,
        payment_type: invoice.payment_type,
        status: invoice.status,
        notes: invoice.notes,
        items: items.map((item: any) => ({
          vendor_name: item.vendors?.name || 'Unknown',
          product_name: item.products?.name || 'Unknown',
          quantity: Number(item.quantity) || 1,
          gross_weight: Number(item.gross_weight),
          box_weight: Number(item.box_weight),
          benches_weight: Number(item.benches_weight),
          net_weight: Number(item.net_weight),
          rate: Number(item.rate),
          total: Number(item.total),
        })),
        loose_items: (looseItems || []).map((item: any) => ({
          vendor_name: item.vendors?.name || 'Unknown',
          product_name: item.product_name,
          net_weight: Number(item.net_weight),
          weight_unit: item.weight_unit as 'kg' | 'g',
          rate: Number(item.rate),
          total: Number(item.total),
        })),
      };
    },
    enabled: !!invoiceId,
  });
}
