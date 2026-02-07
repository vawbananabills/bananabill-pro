export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          bank_details: string | null
          created_at: string | null
          date_format: string | null
          email: string | null
          footer_notes: string | null
          gst_number: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          next_invoice_number: number | null
          phone: string | null
          show_logo_on_invoice: boolean | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          created_at?: string | null
          date_format?: string | null
          email?: string | null
          footer_notes?: string | null
          gst_number?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          next_invoice_number?: number | null
          phone?: string | null
          show_logo_on_invoice?: boolean | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          created_at?: string | null
          date_format?: string | null
          email?: string | null
          footer_notes?: string | null
          gst_number?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          next_invoice_number?: number | null
          phone?: string | null
          show_logo_on_invoice?: boolean | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          balance: number | null
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          opening_balance: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          benches_weight: number | null
          box_weight: number | null
          created_at: string | null
          gross_weight: number | null
          id: string
          invoice_id: string
          net_weight: number | null
          product_id: string | null
          quantity: number | null
          rate: number | null
          total: number | null
          vendor_id: string | null
        }
        Insert: {
          benches_weight?: number | null
          box_weight?: number | null
          created_at?: string | null
          gross_weight?: number | null
          id?: string
          invoice_id: string
          net_weight?: number | null
          product_id?: string | null
          quantity?: number | null
          rate?: number | null
          total?: number | null
          vendor_id?: string | null
        }
        Update: {
          benches_weight?: number | null
          box_weight?: number | null
          created_at?: string | null
          gross_weight?: number | null
          id?: string
          invoice_id?: string
          net_weight?: number | null
          product_id?: string | null
          quantity?: number | null
          rate?: number | null
          total?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          date: string
          discount: number | null
          id: string
          invoice_number: string
          notes: string | null
          other_charges: number | null
          payment_type: string | null
          received_amount: number | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          date?: string
          discount?: number | null
          id?: string
          invoice_number: string
          notes?: string | null
          other_charges?: number | null
          payment_type?: string | null
          received_amount?: number | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          date?: string
          discount?: number | null
          id?: string
          invoice_number?: string
          notes?: string | null
          other_charges?: number | null
          payment_type?: string | null
          received_amount?: number | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      loose_invoice_items: {
        Row: {
          created_at: string | null
          id: string
          invoice_id: string
          loose_product_id: string | null
          net_weight: number | null
          product_name: string
          rate: number | null
          total: number | null
          vendor_id: string | null
          weight_unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_id: string
          loose_product_id?: string | null
          net_weight?: number | null
          product_name: string
          rate?: number | null
          total?: number | null
          vendor_id?: string | null
          weight_unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_id?: string
          loose_product_id?: string | null
          net_weight?: number | null
          product_name?: string
          rate?: number | null
          total?: number | null
          vendor_id?: string | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loose_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loose_invoice_items_loose_product_id_fkey"
            columns: ["loose_product_id"]
            isOneToOne: false
            referencedRelation: "loose_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loose_invoice_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      loose_products: {
        Row: {
          company_id: string
          created_at: string | null
          default_rate: number | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_rate?: number | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_rate?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          target_id: string | null
          target_type: string
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          target_id?: string | null
          target_type?: string
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          target_id?: string | null
          target_type?: string
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      party_adjustments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          date: string
          id: string
          notes: string | null
          type: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          date?: string
          id?: string
          notes?: string | null
          type: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          date?: string
          id?: string
          notes?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          discount: number | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          box_weight: number | null
          box_weight_unit_id: string | null
          company_id: string
          created_at: string | null
          default_rate: number | null
          id: string
          name: string
          stock: number | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          box_weight?: number | null
          box_weight_unit_id?: string | null
          company_id: string
          created_at?: string | null
          default_rate?: number | null
          id?: string
          name: string
          stock?: number | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          box_weight?: number | null
          box_weight_unit_id?: string | null
          company_id?: string
          created_at?: string | null
          default_rate?: number | null
          id?: string
          name?: string
          stock?: number | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_box_weight_unit_id_fkey"
            columns: ["box_weight_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          company_id: string
          created_at: string | null
          date: string
          id: string
          invoice_item_id: string | null
          product_id: string | null
          quantity: number | null
          rate: number | null
          total: number | null
          vendor_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          date: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string | null
          quantity?: number | null
          rate?: number | null
          total?: number | null
          vendor_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          date?: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string | null
          quantity?: number | null
          rate?: number | null
          total?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_settings: {
        Row: {
          created_at: string
          duration_days: number
          first_time_price: number
          id: string
          renewal_price: number
          trial_duration_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number
          first_time_price?: number
          id?: string
          renewal_price?: number
          trial_duration_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          first_time_price?: number
          id?: string
          renewal_price?: number
          trial_duration_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          symbol: string
          weight_value: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          symbol: string
          weight_value?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          symbol?: string
          weight_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_statements: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          date_from: string
          date_to: string
          final_total: number | null
          id: string
          load: number | null
          loader_name: string | null
          mt: number | null
          notes: string | null
          other_expenses: number | null
          other_expenses_is_addition: boolean | null
          rent: number | null
          rent_is_addition: boolean | null
          total_amount: number | null
          total_gross_weight: number | null
          total_items: number | null
          total_net_weight: number | null
          updated_at: string | null
          vehicle_number: string | null
          vendor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          date_from: string
          date_to: string
          final_total?: number | null
          id?: string
          load?: number | null
          loader_name?: string | null
          mt?: number | null
          notes?: string | null
          other_expenses?: number | null
          other_expenses_is_addition?: boolean | null
          rent?: number | null
          rent_is_addition?: boolean | null
          total_amount?: number | null
          total_gross_weight?: number | null
          total_items?: number | null
          total_net_weight?: number | null
          updated_at?: string | null
          vehicle_number?: string | null
          vendor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          date_from?: string
          date_to?: string
          final_total?: number | null
          id?: string
          load?: number | null
          loader_name?: string | null
          mt?: number | null
          notes?: string | null
          other_expenses?: number | null
          other_expenses_is_addition?: boolean | null
          rent?: number | null
          rent_is_addition?: boolean | null
          total_amount?: number | null
          total_gross_weight?: number | null
          total_items?: number | null
          total_net_weight?: number | null
          updated_at?: string | null
          vehicle_number?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_statements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          balance: number | null
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          opening_balance: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_invoices: {
        Row: {
          closing_balance: number | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          date_from: string
          date_to: string
          discount: number | null
          final_total: number | null
          id: string
          notes: string | null
          opening_balance: number | null
          other_charges: number | null
          subtotal: number | null
          total_items: number | null
          total_net_weight: number | null
          total_payments: number | null
          updated_at: string
        }
        Insert: {
          closing_balance?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          date_from: string
          date_to: string
          discount?: number | null
          final_total?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          other_charges?: number | null
          subtotal?: number | null
          total_items?: number | null
          total_net_weight?: number | null
          total_payments?: number | null
          updated_at?: string
        }
        Update: {
          closing_balance?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          date_from?: string
          date_to?: string
          discount?: number | null
          final_total?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          other_charges?: number | null
          subtotal?: number | null
          total_items?: number | null
          total_net_weight?: number | null
          total_payments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { p_user_id: string }; Returns: string }
      handle_new_user_signup: {
        Args: {
          p_company_name: string
          p_email: string
          p_name: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "owner" | "admin" | "manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "owner", "admin", "manager", "staff"],
    },
  },
} as const
