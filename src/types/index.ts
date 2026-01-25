export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'owner' | 'admin' | 'manager' | 'staff';
  companyId?: string;
  createdAt: Date;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  logoUrl?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  bankDetails?: string;
  footerNotes?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  createdAt: Date;
}

export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  createdAt: Date;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  defaultRate: number;
  unitId: string;
  createdAt: Date;
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  symbol: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  grossWeight: number;
  boxWeight: number;
  benchesWeight: number;
  netWeight: number;
  rate: number;
  total: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: Date;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  otherCharges: number;
  total: number;
  paymentType: 'cash' | 'bank' | 'credit';
  status: 'paid' | 'pending' | 'partial';
  createdAt: Date;
}

export interface DashboardStats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalCustomers: number;
  totalVendors: number;
  pendingAmount: number;
}
