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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_generation_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          kind: string
          request_id: string
          result: Json | null
          result_deleted_at: string | null
          result_expires_at: string | null
          status: string
          usage_date: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id: string
          result?: Json | null
          result_deleted_at?: string | null
          result_expires_at?: string | null
          status?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id?: string
          result?: Json | null
          result_deleted_at?: string | null
          result_expires_at?: string | null
          status?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: number
          meta: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: never
          meta?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: never
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      app_error_log: {
        Row: {
          category: string
          code: string | null
          created_at: string
          id: string
          request_id: string | null
          service: string
          status: string
        }
        Insert: {
          category: string
          code?: string | null
          created_at?: string
          id?: string
          request_id?: string | null
          service: string
          status?: string
        }
        Update: {
          category?: string
          code?: string | null
          created_at?: string
          id?: string
          request_id?: string | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          encrypted_value: string | null
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          encrypted_value?: string | null
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          encrypted_value?: string | null
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          created_at: string
          daily_usage_count: number
          email: string
          id: string
          is_unlimited: boolean
          last_reset_date: string
          subscription_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_usage_count?: number
          email: string
          id: string
          is_unlimited?: boolean
          last_reset_date?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_usage_count?: number
          email?: string
          id?: string
          is_unlimited?: boolean
          last_reset_date?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_tax_settings: {
        Row: {
          business_address: string
          business_contact: string
          business_name: string
          gst_collection_enabled: boolean
          gst_registered: boolean
          gstin: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          business_address?: string
          business_contact?: string
          business_name?: string
          gst_collection_enabled?: boolean
          gst_registered?: boolean
          gstin?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          business_address?: string
          business_contact?: string
          business_name?: string
          gst_collection_enabled?: boolean
          gst_registered?: boolean
          gstin?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          category: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_submission_limits: {
        Row: {
          day_count: number
          day_started_on: string
          key_hash: string
          updated_at: string
          window_count: number
          window_started_at: string
        }
        Insert: {
          day_count?: number
          day_started_on?: string
          key_hash: string
          updated_at?: string
          window_count?: number
          window_started_at?: string
        }
        Update: {
          day_count?: number
          day_started_on?: string
          key_hash?: string
          updated_at?: string
          window_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      free_entitlements: {
        Row: {
          consumed_at: string | null
          granted_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          granted_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          granted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_preps: {
        Row: {
          application_id: string | null
          created_at: string
          encrypted_job_description: string | null
          id: string
          job_description: string
          job_title: string
          prep_json: Json
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          encrypted_job_description?: string | null
          id?: string
          job_description?: string
          job_title?: string
          prep_json: Json
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          encrypted_job_description?: string | null
          id?: string
          job_description?: string
          job_title?: string
          prep_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_preps_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string | null
          client_request_id: string | null
          company: string
          created_at: string
          custom_platform: string
          encrypted_job_description: string | null
          id: string
          job_description: string
          job_title: string
          job_url: string
          location: string
          notes: string
          platform: string
          resume_version_id: string | null
          salary: string
          status: string
          status_history: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          client_request_id?: string | null
          company?: string
          created_at?: string
          custom_platform?: string
          encrypted_job_description?: string | null
          id?: string
          job_description?: string
          job_title?: string
          job_url?: string
          location?: string
          notes?: string
          platform?: string
          resume_version_id?: string | null
          salary?: string
          status?: string
          status_history?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          client_request_id?: string | null
          company?: string
          created_at?: string
          custom_platform?: string
          encrypted_job_description?: string | null
          id?: string
          job_description?: string
          job_title?: string
          job_url?: string
          location?: string
          notes?: string
          platform?: string
          resume_version_id?: string | null
          salary?: string
          status?: string
          status_history?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_plans: {
        Row: {
          created_at: string
          id: string
          job_title: string
          milestones: Json
          priority: string
          skill: string
          updated_at: string
          user_id: string
          why: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_title?: string
          milestones?: Json
          priority?: string
          skill: string
          updated_at?: string
          user_id: string
          why?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_title?: string
          milestones?: Json
          priority?: string
          skill?: string
          updated_at?: string
          user_id?: string
          why?: string
        }
        Relationships: []
      }
      partner_commission_ledger: {
        Row: {
          created_at: string
          id: string
          owner_share: number
          partner_id: string
          sale_id: string
          settlement_month: string
          share_percent: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_share: number
          partner_id: string
          sale_id: string
          settlement_month: string
          share_percent: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_share?: number
          partner_id?: string
          sale_id?: string
          settlement_month?: string
          share_percent?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commission_ledger_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commission_ledger_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "partner_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_credit_transactions: {
        Row: {
          amount_inr: number | null
          created_at: string
          credits: number
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          kind: string
          note: string
          partner_id: string
          sale_id: string | null
        }
        Insert: {
          amount_inr?: number | null
          created_at?: string
          credits: number
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          kind: string
          note?: string
          partner_id: string
          sale_id?: string | null
        }
        Update: {
          amount_inr?: number | null
          created_at?: string
          credits?: number
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          kind?: string
          note?: string
          partner_id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_credit_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_credit_wallets: {
        Row: {
          avg_cost_per_credit: number
          balance: number
          lifetime_consumed: number
          lifetime_purchased: number
          partner_id: string
          updated_at: string
        }
        Insert: {
          avg_cost_per_credit?: number
          balance?: number
          lifetime_consumed?: number
          lifetime_purchased?: number
          partner_id: string
          updated_at?: string
        }
        Update: {
          avg_cost_per_credit?: number
          balance?: number
          lifetime_consumed?: number
          lifetime_purchased?: number
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_credit_wallets_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_daily_usage: {
        Row: {
          partner_id: string
          usage_date: string
          used: number
        }
        Insert: {
          partner_id: string
          usage_date: string
          used?: number
        }
        Update: {
          partner_id?: string
          usage_date?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_daily_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          created_at: string
          credits: number
          id: string
          idempotency_key: string | null
          invoice_number: string
          package_id: string | null
          package_name: string
          paid_at: string | null
          partner_id: string
          payment_reference: string | null
          payment_status: string
          subtotal: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          idempotency_key?: string | null
          invoice_number: string
          package_id?: string | null
          package_name: string
          paid_at?: string | null
          partner_id: string
          payment_reference?: string | null
          payment_status?: string
          subtotal: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          idempotency_key?: string | null
          invoice_number?: string
          package_id?: string | null
          package_name?: string
          paid_at?: string | null
          partner_id?: string
          payment_reference?: string | null
          payment_status?: string
          subtotal?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "partner_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_package_prices: {
        Row: {
          created_at: string
          id: string
          package_id: string
          partner_id: string
          price_inr: number
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          partner_id: string
          price_inr: number
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          partner_id?: string
          price_inr?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_package_prices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "partner_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_package_prices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_packages: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          id: string
          name: string
          price_inr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          id?: string
          name: string
          price_inr: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          id?: string
          name?: string
          price_inr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_sales: {
        Row: {
          attribution_source: string
          client_request_id: string
          created_at: string
          gross_margin: number
          id: string
          owner_share: number
          partner_id: string
          selling_price: number
          status: string
          wholesale_cost: number
        }
        Insert: {
          attribution_source?: string
          client_request_id: string
          created_at?: string
          gross_margin: number
          id?: string
          owner_share: number
          partner_id: string
          selling_price: number
          status?: string
          wholesale_cost: number
        }
        Update: {
          attribution_source?: string
          client_request_id?: string
          created_at?: string
          gross_margin?: number
          id?: string
          owner_share?: number
          partner_id?: string
          selling_price?: number
          status?: string
          wholesale_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_settings: {
        Row: {
          estimated_generation_cost: number
          id: boolean
          max_selling_price: number
          min_selling_price: number
          owner_share_percent: number
          updated_at: string
        }
        Insert: {
          estimated_generation_cost?: number
          id?: boolean
          max_selling_price?: number
          min_selling_price?: number
          owner_share_percent?: number
          updated_at?: string
        }
        Update: {
          estimated_generation_cost?: number
          id?: boolean
          max_selling_price?: number
          min_selling_price?: number
          owner_share_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          business_name: string
          category: string
          contact_person: string
          created_at: string
          daily_credit_limit: number
          email: string
          id: string
          location: string
          partner_code: string
          phone: string
          selling_price: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_name: string
          category?: string
          contact_person?: string
          created_at?: string
          daily_credit_limit?: number
          email?: string
          id?: string
          location?: string
          partner_code: string
          phone?: string
          selling_price?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_name?: string
          category?: string
          contact_person?: string
          created_at?: string
          daily_credit_limit?: number
          email?: string
          id?: string
          location?: string
          partner_code?: string
          phone?: string
          selling_price?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          id: string
          payment_method: string
          plan_id: string
          provider: string
          status: string
          updated_at: string
          upi_reference: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          payment_method?: string
          plan_id: string
          provider?: string
          status?: string
          updated_at?: string
          upi_reference?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          payment_method?: string
          plan_id?: string
          provider?: string
          status?: string
          updated_at?: string
          upi_reference?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          encrypted_education: string | null
          encrypted_personal_info: string | null
          encrypted_projects: string | null
          encrypted_skills: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_education?: string | null
          encrypted_personal_info?: string | null
          encrypted_projects?: string | null
          encrypted_skills?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_education?: string | null
          encrypted_personal_info?: string | null
          encrypted_projects?: string | null
          encrypted_skills?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_templates: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          ats_score: number | null
          company: string
          created_at: string
          encrypted_job_description: string | null
          encrypted_resume_payload: string | null
          id: string
          job_description: string
          job_title: string
          match_score: number | null
          resume_json: Json
          template_id: string
          user_id: string
          version: number
        }
        Insert: {
          ats_score?: number | null
          company?: string
          created_at?: string
          encrypted_job_description?: string | null
          encrypted_resume_payload?: string | null
          id?: string
          job_description?: string
          job_title?: string
          match_score?: number | null
          resume_json: Json
          template_id?: string
          user_id: string
          version?: number
        }
        Update: {
          ats_score?: number | null
          company?: string
          created_at?: string
          encrypted_job_description?: string | null
          encrypted_resume_payload?: string | null
          id?: string
          job_description?: string
          job_title?: string
          match_score?: number | null
          resume_json?: Json
          template_id?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          features: string[]
          highlight: boolean
          id: string
          pdf_credits: number
          plan_code: string | null
          plan_name: string
          plan_type: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_days: number
          features?: string[]
          highlight?: boolean
          id?: string
          pdf_credits?: number
          plan_code?: string | null
          plan_name: string
          plan_type?: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          features?: string[]
          highlight?: boolean
          id?: string
          pdf_credits?: number
          plan_code?: string | null
          plan_name?: string
          plan_type?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          credits_total: number
          credits_used: number
          end_date: string
          id: string
          payment_id: string | null
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          end_date: string
          id?: string
          payment_id?: string | null
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          end_date?: string
          id?: string
          payment_id?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_id: string | null
          status: string
          user_id: string | null
          validity_end: string | null
          validity_start: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string | null
          status?: string
          user_id?: string | null
          validity_end?: string | null
          validity_start?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string | null
          status?: string
          user_id?: string | null
          validity_end?: string | null
          validity_start?: string | null
        }
        Relationships: []
      }
      upi_configuration: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          id: string
          instructions: string | null
          qr_image_path: string | null
          updated_at: string
          upi_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          instructions?: string | null
          qr_image_path?: string | null
          updated_at?: string
          upi_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          instructions?: string | null
          qr_image_path?: string | null
          updated_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_user_counts: { Args: { _since: string }; Returns: Json }
      clear_expired_ai_results: {
        Args: { _retention_days: number }
        Returns: number
      }
      consume_contact_submission: {
        Args: {
          _daily_limit: number
          _key_hash: string
          _window_limit: number
          _window_seconds: number
        }
        Returns: boolean
      }
      consume_daily_quota: {
        Args: { _daily_limit: number; _user_id: string }
        Returns: boolean
      }
      consume_free_entitlement: { Args: { _user_id: string }; Returns: boolean }
      consume_pdf_credit: { Args: { _user_id: string }; Returns: boolean }
      delete_user_account: { Args: { _user_id: string }; Returns: undefined }
      finish_ai_generation: {
        Args: {
          _request_id: string
          _result: Json
          _success: boolean
          _user_id: string
        }
        Returns: undefined
      }
      finish_partner_resume_generation: {
        Args: {
          _partner_id: string
          _request_id: string
          _result: Json
          _success: boolean
          _user_id: string
        }
        Returns: Json
      }
      get_ai_usage: { Args: { _kind: string; _user_id: string }; Returns: Json }
      get_partner_usage: { Args: { _partner_id: string }; Returns: Json }
      grant_free_entitlement: { Args: { _user_id: string }; Returns: boolean }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      partner_consume_credit: {
        Args: { _partner_id: string; _request_id: string }
        Returns: Json
      }
      partner_record_purchase: {
        Args: {
          _idempotency_key: string
          _package_id: string
          _partner_id: string
          _payment_reference: string
        }
        Returns: Json
      }
      partner_release_credit: {
        Args: { _partner_id: string; _request_id: string }
        Returns: boolean
      }
      partner_verify_invoice: {
        Args: { _invoice_id: string }
        Returns: boolean
      }
      start_ai_generation: {
        Args: {
          _cooldown_seconds: number
          _kind: string
          _limit: number
          _request_id: string
          _user_id: string
        }
        Returns: Json
      }
      start_partner_resume_generation: {
        Args: { _partner_id: string; _request_id: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "partner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "partner"],
    },
  },
} as const
