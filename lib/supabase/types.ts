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
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          customer_id: string
          department: string
          details: string | null
          id: string
          is_default: boolean
          label: string | null
          phone: string
          postal_code: string | null
          recipient_name: string
          street: string
          updated_at: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          customer_id: string
          department: string
          details?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          postal_code?: string | null
          recipient_name: string
          street: string
          updated_at?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          department?: string
          details?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          postal_code?: string | null
          recipient_name?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_allowlist: {
        Row: {
          added_at: string
          email: string
          full_name: string | null
          role: string
        }
        Insert: {
          added_at?: string
          email: string
          full_name?: string | null
          role: string
        }
        Update: {
          added_at?: string
          email?: string
          full_name?: string | null
          role?: string
        }
        Relationships: []
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_at: string
          invited_by: string | null
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_capabilities: {
        Row: {
          code: string
          category: string
          description: string
          created_at: string
        }
        Insert: {
          code: string
          category: string
          description: string
          created_at?: string
        }
        Update: {
          code?: string
          category?: string
          description?: string
          created_at?: string
        }
        Relationships: []
      }
      admin_role_capabilities: {
        Row: {
          role: string
          capability_code: string
          granted_at: string
          granted_by: string | null
        }
        Insert: {
          role: string
          capability_code: string
          granted_at?: string
          granted_by?: string | null
        }
        Update: {
          role?: string
          capability_code?: string
          granted_at?: string
          granted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_capabilities_capability_code_fkey"
            columns: ["capability_code"]
            isOneToOne: false
            referencedRelation: "admin_capabilities"
            referencedColumns: ["code"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          request_ip: string | null
          request_user_agent: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          request_ip?: string | null
          request_user_agent?: string | null
          summary: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          request_ip?: string | null
          request_user_agent?: string | null
          summary?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: string
        }
        Relationships: []
      }
      ai_generation_log: {
        Row: {
          applied_at: string | null
          applied_to_product: boolean | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          model: string
          output_parsed: Json | null
          output_raw: string | null
          output_tokens: number | null
          product_id: string
          prompt_input: Json | null
          prompt_template_id: string
          regulatory_issues: string[] | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_to_product?: boolean | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          output_parsed?: Json | null
          output_raw?: string | null
          output_tokens?: number | null
          product_id: string
          prompt_input?: Json | null
          prompt_template_id: string
          regulatory_issues?: string[] | null
          status: string
          triggered_by?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_to_product?: boolean | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_parsed?: Json | null
          output_raw?: string | null
          output_tokens?: number | null
          product_id?: string
          prompt_input?: Json | null
          prompt_template_id?: string
          regulatory_issues?: string[] | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          cart_id: string
          id: string
          price_cop_at_add: number
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          added_at?: string
          cart_id: string
          id?: string
          price_cop_at_add: number
          product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          added_at?: string
          cart_id?: string
          id?: string
          price_cop_at_add?: number
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          abandoned_at: string | null
          created_at: string
          customer_id: string | null
          id: string
          recovery_email_sent_at: string | null
          status: string
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          recovery_email_sent_at?: string | null
          status?: string
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          recovery_email_sent_at?: string | null
          status?: string
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          suggested_tax_rate_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          suggested_tax_rate_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          suggested_tax_rate_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_suggested_tax_rate_id_fkey"
            columns: ["suggested_tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          customer_id: string | null
          id: string
          last_message_at: string
          led_to_purchase: boolean
          message_count: number
          resolved: boolean
          started_at: string
          visitor_id: string | null
        }
        Insert: {
          customer_id?: string | null
          id?: string
          last_message_at?: string
          led_to_purchase?: boolean
          message_count?: number
          resolved?: boolean
          started_at?: string
          visitor_id?: string | null
        }
        Update: {
          customer_id?: string | null
          id?: string
          last_message_at?: string
          led_to_purchase?: boolean
          message_count?: number
          resolved?: boolean
          started_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      content_units: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          symbol: string
          unit_family: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          symbol: string
          unit_family: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          symbol?: string
          unit_family?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          customer_email: string
          discount_applied_cop: number
          id: string
          order_id: string
          redeemed_at: string
        }
        Insert: {
          coupon_id: string
          customer_email: string
          discount_applied_cop: number
          id?: string
          order_id: string
          redeemed_at?: string
        }
        Update: {
          coupon_id?: string
          customer_email?: string
          discount_applied_cop?: number
          id?: string
          order_id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_cop: number | null
          max_total_uses: number | null
          max_uses_per_customer: number
          min_order_cop: number
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_cop?: number | null
          max_total_uses?: number | null
          max_uses_per_customer?: number
          min_order_cop?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_cop?: number | null
          max_total_uses?: number | null
          max_uses_per_customer?: number
          min_order_cop?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      csv_imports: {
        Row: {
          admin_user_id: string | null
          completed_at: string | null
          created_at: string
          data_source_id: string | null
          error_log: Json | null
          file_url: string | null
          filename: string
          id: string
          rows_failed: number | null
          rows_imported: number | null
          rows_total: number | null
          status: string
        }
        Insert: {
          admin_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          data_source_id?: string | null
          error_log?: Json | null
          file_url?: string | null
          filename: string
          id?: string
          rows_failed?: number | null
          rows_imported?: number | null
          rows_total?: number | null
          status?: string
        }
        Update: {
          admin_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          data_source_id?: string | null
          error_log?: Json | null
          file_url?: string | null
          filename?: string
          id?: string
          rows_failed?: number | null
          rows_imported?: number | null
          rows_total?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_imports_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_imports_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accepts_marketing: boolean
          created_at: string
          document_number: string | null
          document_type: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          accepts_marketing?: boolean
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          accepts_marketing?: boolean
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          base_url: string | null
          catalog_url: string | null
          created_at: string
          id: string
          is_active: boolean
          laboratory_id: string | null
          last_run_at: string | null
          last_run_error: string | null
          last_run_products_found: number | null
          last_run_status: string | null
          name: string
          scraper_config: Json | null
          scraper_strategy: string | null
          type: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          catalog_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          laboratory_id?: string | null
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_products_found?: number | null
          last_run_status?: string | null
          name: string
          scraper_config?: Json | null
          scraper_strategy?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          catalog_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          laboratory_id?: string | null
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_products_found?: number | null
          last_run_status?: string | null
          name?: string
          scraper_config?: Json | null
          scraper_strategy?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string | null
          message_id: string | null
          metadata: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          job_id?: string | null
          message_id?: string | null
          metadata?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string | null
          message_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "email_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_steps: {
        Row: {
          active: boolean
          created_at: string
          delay_seconds: number
          flow_id: string
          id: string
          step_order: number
          subject: string
          template: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delay_seconds?: number
          flow_id: string
          id?: string
          step_order: number
          subject: string
          template: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delay_seconds?: number
          flow_id?: string
          id?: string
          step_order?: number
          subject?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flows: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          name: string
          trigger_event: string | null
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id: string
          name: string
          trigger_event?: string | null
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          name?: string
          trigger_event?: string | null
        }
        Relationships: []
      }
      email_jobs: {
        Row: {
          attempts: number
          created_at: string
          flow_id: string | null
          flow_step_id: string | null
          id: string
          idempotency_key: string | null
          last_error: string | null
          message_id: string | null
          payload: Json
          scheduled_at: string
          status: string
          subject: string
          template: string
          to_email: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          flow_id?: string | null
          flow_step_id?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          message_id?: string | null
          payload?: Json
          scheduled_at?: string
          status?: string
          subject: string
          template: string
          to_email: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          flow_id?: string | null
          flow_step_id?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          message_id?: string | null
          payload?: Json
          scheduled_at?: string
          status?: string
          subject?: string
          template?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_jobs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_jobs_flow_step_id_fkey"
            columns: ["flow_step_id"]
            isOneToOne: false
            referencedRelation: "email_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          created_at: string
          diagnostic_code: string | null
          email: string
          id: string
          notes: string | null
          reason: string
          source: string
          sub_reason: string | null
          suppressed_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnostic_code?: string | null
          email: string
          id?: string
          notes?: string | null
          reason: string
          source?: string
          sub_reason?: string | null
          suppressed_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnostic_code?: string | null
          email?: string
          id?: string
          notes?: string | null
          reason?: string
          source?: string
          sub_reason?: string | null
          suppressed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          page_title: string | null
          page_url: string | null
          product_id: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          page_title?: string | null
          page_url?: string | null
          product_id?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          page_title?: string | null
          page_url?: string | null
          product_id?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          created_at: string
          dek: string
          faqs: Json
          hero_image_alt: string
          hero_image_url: string
          id: string
          product_mentions: Json
          published_at: string | null
          reading_time: string
          sections: Json
          slug: string
          status: string
          title: string
          tldr: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dek: string
          faqs?: Json
          hero_image_alt: string
          hero_image_url: string
          id?: string
          product_mentions?: Json
          published_at?: string | null
          reading_time?: string
          sections?: Json
          slug: string
          status?: string
          title: string
          tldr: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dek?: string
          faqs?: Json
          hero_image_alt?: string
          hero_image_url?: string
          id?: string
          product_mentions?: Json
          published_at?: string | null
          reading_time?: string
          sections?: Json
          slug?: string
          status?: string
          title?: string
          tldr?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          type: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          type: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          type?: string
        }
        Relationships: []
      }
      laboratories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          scrape_url: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          scrape_url?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          scrape_url?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          quiz_properties: Json | null
          source: string | null
          status: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          quiz_properties?: Json | null
          source?: string | null
          status?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          quiz_properties?: Json | null
          source?: string | null
          status?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          subtotal_cop: number
          unit_price_cop: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          subtotal_cop: number
          unit_price_cop: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          subtotal_cop?: number
          unit_price_cop?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bold_payment_id: string | null
          bold_payment_link: string | null
          cart_id: string | null
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          discount_cop: number
          fulfillment_status: string
          guest_token: string | null
          id: string
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_status: string
          savia_attribution_job_id: string | null
          shipped_at: string | null
          shipping_carrier: string | null
          shipping_city: string
          shipping_cop: number
          shipping_country: string
          shipping_department: string
          shipping_details: string | null
          shipping_phone: string
          shipping_postal_code: string | null
          shipping_recipient: string
          shipping_street: string
          status: string
          subtotal_cop: number
          tax_cop: number
          total_cop: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          bold_payment_id?: string | null
          bold_payment_link?: string | null
          cart_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          discount_cop?: number
          fulfillment_status?: string
          guest_token?: string | null
          id?: string
          notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_status?: string
          savia_attribution_job_id?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_city: string
          shipping_cop?: number
          shipping_country?: string
          shipping_department: string
          shipping_details?: string | null
          shipping_phone: string
          shipping_postal_code?: string | null
          shipping_recipient: string
          shipping_street: string
          status?: string
          subtotal_cop: number
          tax_cop?: number
          total_cop: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          bold_payment_id?: string | null
          bold_payment_link?: string | null
          cart_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          discount_cop?: number
          fulfillment_status?: string
          guest_token?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_status?: string
          savia_attribution_job_id?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_city?: string
          shipping_cop?: number
          shipping_country?: string
          shipping_department?: string
          shipping_details?: string | null
          shipping_phone?: string
          shipping_postal_code?: string | null
          shipping_recipient?: string
          shipping_street?: string
          status?: string
          subtotal_cop?: number
          tax_cop?: number
          total_cop?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_savia_attribution_job_id_fkey"
            columns: ["savia_attribution_job_id"]
            isOneToOne: false
            referencedRelation: "email_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_types: {
        Row: {
          code: string
          created_at: string
          default_unit: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          unit_family: string
        }
        Insert: {
          code: string
          created_at?: string
          default_unit?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          unit_family: string
        }
        Update: {
          code?: string
          created_at?: string
          default_unit?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          unit_family?: string
        }
        Relationships: []
      }
      product_attribute_options: {
        Row: {
          attribute_id: string
          id: string
          slug: string
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          id?: string
          slug: string
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          id?: string
          slug?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_options_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          option_id: string | null
          product_id: string
          text_value: string | null
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          option_id?: string | null
          product_id: string
          text_value?: string | null
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          option_id?: string | null
          product_id?: string
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          attribute_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_filterable: boolean
          name: string
          show_in_card: boolean
          slug: string
          sort_order: number
        }
        Insert: {
          attribute_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_filterable?: boolean
          name: string
          show_in_card?: boolean
          slug: string
          sort_order?: number
        }
        Update: {
          attribute_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_filterable?: boolean
          name?: string
          show_in_card?: boolean
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          added_at: string
          collection_id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string
          collection_id: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string
          collection_id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory: {
        Row: {
          id: string
          location_id: string
          low_stock_threshold: number | null
          product_id: string
          reserved: number
          stock: number
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          low_stock_threshold?: number | null
          product_id: string
          reserved?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          low_stock_threshold?: number | null
          product_id?: string
          reserved?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_replied_at: string | null
          admin_reply: string | null
          body: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          body?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          body?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sync_runs: {
        Row: {
          applied_at: string | null
          created_at: string
          created_by: string | null
          id: string
          laboratory_id: string
          lines_applied: number
          lines_matched: number
          lines_parsed: number
          payload: Json
          source_filename: string | null
          source_format: string
          status: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          laboratory_id: string
          lines_applied?: number
          lines_matched?: number
          lines_parsed?: number
          payload?: Json
          source_filename?: string | null
          source_format: string
          status?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          laboratory_id?: string
          lines_applied?: number
          lines_matched?: number
          lines_parsed?: number
          payload?: Json
          source_filename?: string | null
          source_format?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_sync_runs_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_metadata: Json | null
          category_id: string | null
          compare_at_price_cop: number | null
          composition_use: string | null
          content_unit: string | null
          content_value: number | null
          cost_cop: number | null
          created_at: string
          data_source_id: string | null
          description: string | null
          dosage: string | null
          equivalence_group: string | null
          external_id: string | null
          full_description: string | null
          id: string
          ingredients: string | null
          invima_number: string | null
          is_active: boolean
          is_featured: boolean
          laboratory_id: string
          last_image_attempt_at: string | null
          last_image_error: string | null
          last_synced_at: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          needs_review: boolean
          presentation: string | null
          presentation_type: string | null
          price_cop: number
          reco_content_hash: string | null
          reco_synced_at: string | null
          reco_synced_hash: string | null
          scrape_url: string | null
          scraped_at: string | null
          search_keywords: string | null
          search_vector: unknown
          short_description: string | null
          sku: string | null
          slug: string
          source_price_cop: number | null
          source_price_updated_at: string | null
          source_type: string
          source_url: string | null
          status: string
          stock: number
          tags: string[] | null
          tax_rate_id: string
          track_stock: boolean
          updated_at: string
          usage_instructions: string | null
          warnings: string | null
          weight_grams: number | null
        }
        Insert: {
          ai_metadata?: Json | null
          category_id?: string | null
          compare_at_price_cop?: number | null
          composition_use?: string | null
          content_unit?: string | null
          content_value?: number | null
          cost_cop?: number | null
          created_at?: string
          data_source_id?: string | null
          description?: string | null
          dosage?: string | null
          equivalence_group?: string | null
          external_id?: string | null
          full_description?: string | null
          id?: string
          ingredients?: string | null
          invima_number?: string | null
          is_active?: boolean
          is_featured?: boolean
          laboratory_id: string
          last_image_attempt_at?: string | null
          last_image_error?: string | null
          last_synced_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          needs_review?: boolean
          presentation?: string | null
          presentation_type?: string | null
          price_cop: number
          reco_content_hash?: string | null
          reco_synced_at?: string | null
          reco_synced_hash?: string | null
          scrape_url?: string | null
          scraped_at?: string | null
          search_keywords?: string | null
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug: string
          source_price_cop?: number | null
          source_price_updated_at?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          stock?: number
          tags?: string[] | null
          tax_rate_id: string
          track_stock?: boolean
          updated_at?: string
          usage_instructions?: string | null
          warnings?: string | null
          weight_grams?: number | null
        }
        Update: {
          ai_metadata?: Json | null
          category_id?: string | null
          compare_at_price_cop?: number | null
          composition_use?: string | null
          content_unit?: string | null
          content_value?: number | null
          cost_cop?: number | null
          created_at?: string
          data_source_id?: string | null
          description?: string | null
          dosage?: string | null
          equivalence_group?: string | null
          external_id?: string | null
          full_description?: string | null
          id?: string
          ingredients?: string | null
          invima_number?: string | null
          is_active?: boolean
          is_featured?: boolean
          laboratory_id?: string
          last_image_attempt_at?: string | null
          last_image_error?: string | null
          last_synced_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          needs_review?: boolean
          presentation?: string | null
          presentation_type?: string | null
          price_cop?: number
          reco_content_hash?: string | null
          reco_synced_at?: string | null
          reco_synced_hash?: string | null
          scrape_url?: string | null
          scraped_at?: string | null
          search_keywords?: string | null
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug?: string
          source_price_cop?: number | null
          source_price_updated_at?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          stock?: number
          tags?: string[] | null
          tax_rate_id?: string
          track_stock?: boolean
          updated_at?: string
          usage_instructions?: string | null
          warnings?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      products_name_backup_20260608: {
        Row: {
          id: string | null
          name: string | null
          presentation: string | null
          presentation_type: string | null
          snapshot_at: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          presentation?: string | null
          presentation_type?: string | null
          snapshot_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          presentation?: string | null
          presentation_type?: string | null
          snapshot_at?: string | null
        }
        Relationships: []
      }
      quiz_match_cache: {
        Row: {
          cache_key: string
          created_at: string
          etapa: string
          expires_at: string
          hit_count: number
          id: string
          model: string
          objetivo: string
          recommendations: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          etapa: string
          expires_at?: string
          hit_count?: number
          id?: string
          model?: string
          objetivo: string
          recommendations: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          etapa?: string
          expires_at?: string
          hit_count?: number
          id?: string
          model?: string
          objetivo?: string
          recommendations?: Json
        }
        Relationships: []
      }
      quiz_needs: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_reco_sync_runs: {
        Row: {
          dirty_count: number
          error_detail: string | null
          failed: number
          finished_at: string | null
          id: string
          processed: number
          started_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          dirty_count?: number
          error_detail?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          started_at?: string
          status?: string
          trigger_source: string
        }
        Update: {
          dirty_count?: number
          error_detail?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: []
      }
      quiz_recommendations: {
        Row: {
          generated_at: string
          generated_by: string | null
          id: string
          need_id: string
          product_id: string
          reason: string | null
          relevance_tier: string
          review_status: string
          score: number
          suitable_stages: string[]
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          need_id: string
          product_id: string
          reason?: string | null
          relevance_tier: string
          review_status?: string
          score?: number
          suitable_stages?: string[]
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          need_id?: string
          product_id?: string
          reason?: string | null
          relevance_tier?: string
          review_status?: string
          score?: number
          suitable_stages?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_recommendations_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "quiz_needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          etapa: string
          id: string
          objetivo: string
          products: Json
          slug: string
          view_count: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          etapa: string
          id?: string
          objetivo: string
          products: Json
          slug: string
          view_count?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          etapa?: string
          id?: string
          objetivo?: string
          products?: Json
          slug?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_jobs: {
        Row: {
          batch_size: number | null
          completed_at: string | null
          data_source_id: string
          error_message: string | null
          id: string
          last_offset: number | null
          last_progress_at: string | null
          log: Json | null
          paused_at: string | null
          products_created: number | null
          products_failed: number | null
          products_found: number | null
          products_skipped: number | null
          products_updated: number | null
          started_at: string
          status: string
          total_pages: number | null
          triggered_by: string | null
        }
        Insert: {
          batch_size?: number | null
          completed_at?: string | null
          data_source_id: string
          error_message?: string | null
          id?: string
          last_offset?: number | null
          last_progress_at?: string | null
          log?: Json | null
          paused_at?: string | null
          products_created?: number | null
          products_failed?: number | null
          products_found?: number | null
          products_skipped?: number | null
          products_updated?: number | null
          started_at?: string
          status?: string
          total_pages?: number | null
          triggered_by?: string | null
        }
        Update: {
          batch_size?: number | null
          completed_at?: string | null
          data_source_id?: string
          error_message?: string | null
          id?: string
          last_offset?: number | null
          last_progress_at?: string | null
          log?: Json | null
          paused_at?: string | null
          products_created?: number | null
          products_failed?: number | null
          products_found?: number | null
          products_skipped?: number | null
          products_updated?: number | null
          started_at?: string
          status?: string
          total_pages?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraping_jobs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraping_jobs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          created_at: string
          department: string
          flat_cop: number
          free_above_cop: number | null
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          flat_cop: number
          free_above_cop?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          flat_cop?: number
          free_above_cop?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          rate_percent: number
          sort_order: number
          tax_type: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          rate_percent: number
          sort_order?: number
          tax_type: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          rate_percent?: number
          sort_order?: number
          tax_type?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          customer_id: string | null
          device_type: string | null
          event_props: Json
          event_type: string
          id: string
          identified: boolean
          ip_address: unknown | null
          os: string | null
          page_path: string
          page_title: string | null
          referrer: string | null
          region: string | null
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_first_campaign: string | null
          utm_first_medium: string | null
          utm_first_source: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_id?: string | null
          device_type?: string | null
          event_props?: Json
          event_type: string
          id?: string
          identified?: boolean
          ip_address?: unknown | null
          os?: string | null
          page_path: string
          page_title?: string | null
          referrer?: string | null
          region?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_first_campaign?: string | null
          utm_first_medium?: string | null
          utm_first_source?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_id?: string | null
          device_type?: string | null
          event_props?: Json
          event_type?: string
          id?: string
          identified?: boolean
          ip_address?: unknown | null
          os?: string | null
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_first_campaign?: string | null
          utm_first_medium?: string | null
          utm_first_source?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          city: string | null
          country: string | null
          customer_id: string | null
          fingerprint: string | null
          first_landing_page: string | null
          first_referrer: string | null
          first_seen_at: string
          first_utm_campaign: string | null
          first_utm_medium: string | null
          first_utm_source: string | null
          id: string
          ip_address: unknown
          last_seen_at: string
          page_view_count: number
          total_time_seconds: number
          user_agent: string | null
          visit_count: number
        }
        Insert: {
          city?: string | null
          country?: string | null
          customer_id?: string | null
          fingerprint?: string | null
          first_landing_page?: string | null
          first_referrer?: string | null
          first_seen_at?: string
          first_utm_campaign?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          page_view_count?: number
          total_time_seconds?: number
          user_agent?: string | null
          visit_count?: number
        }
        Update: {
          city?: string | null
          country?: string | null
          customer_id?: string | null
          fingerprint?: string | null
          first_landing_page?: string | null
          first_referrer?: string | null
          first_seen_at?: string
          first_utm_campaign?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          page_view_count?: number
          total_time_seconds?: number
          user_agent?: string | null
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "visitors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_review_stats: {
        Row: {
          average_rating: number | null
          count_1: number | null
          count_2: number | null
          count_3: number | null
          count_4: number | null
          count_5: number | null
          product_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "quiz_reco_dirty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_reco_dirty_products: {
        Row: {
          id: string | null
          name: string | null
          reco_content_hash: string | null
          reco_synced_at: string | null
          reco_synced_hash: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          reco_content_hash?: string | null
          reco_synced_at?: string | null
          reco_synced_hash?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          reco_content_hash?: string | null
          reco_synced_at?: string | null
          reco_synced_hash?: string | null
        }
        Relationships: []
      }
      v_savia_cron_runs: {
        Row: {
          end_time: string | null
          jobname: string | null
          return_message: string | null
          start_time: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_quiz_cache: { Args: never; Returns: undefined }
      compute_reco_content_hash: {
        Args: { p_product_id: string }
        Returns: string
      }
      current_admin_role: { Args: never; Returns: string }
      current_admin_has_capability: {
        Args: { p_code: string }
        Returns: boolean
      }
      customer_clv_summary: {
        Args: never
        Returns: {
          total_customers: number
          repeat_customers: number
          repeat_rate_pct: number
          aov_cop: number
          clv_estimate_cop: number
          avg_days_between_orders: number
          total_revenue_cop: number
          as_of: string
        }[]
      }
      customer_cohorts: {
        Args: { p_months?: number }
        Returns: {
          cohort_month: string
          cohort_size: number
          months_since: number
          active_customers: number
          as_of: string
        }[]
      }
      customer_rfm: {
        Args: never
        Returns: {
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          last_order_at: string
          days_since_last_order: number
          orders_count: number
          lifetime_revenue_cop: number
          avg_order_value_cop: number
          r_score: number
          f_score: number
          m_score: number
          segment_code: string
          as_of: string
        }[]
      }
      get_guest_order: {
        Args: { p_order_number: string; p_token: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          discount_cop: number
          fulfillment_status: string
          id: string
          order_number: string
          payment_status: string
          shipping_carrier: string
          shipping_city: string
          shipping_cop: number
          shipping_department: string
          shipping_details: string
          shipping_phone: string
          shipping_postal_code: string
          shipping_recipient: string
          shipping_street: string
          status: string
          subtotal_cop: number
          tax_cop: number
          total_cop: number
          tracking_number: string
        }[]
      }
      get_guest_order_items: {
        Args: { p_order_number: string; p_token: string }
        Returns: {
          product_image_url: string
          product_name: string
          product_sku: string
          quantity: number
          subtotal_cop: number
          unit_price_cop: number
        }[]
      }
      get_home_featured: {
        Args: { p_limit?: number }
        Returns: {
          image_url: string
          name: string
          price_cop: number
          priority: number
          product_id: string
          slug: string
          source: string
        }[]
      }
      home_top_selling_product_ids: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          product_id: string
          units_sold: number
        }[]
      }
      increment_coupon_uses: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      increment_quiz_result_views: {
        Args: { result_slug: string }
        Returns: undefined
      }
      is_email_suppressed: { Args: { p_email: string }; Returns: boolean }
      resolve_quiz: {
        Args: {
          p_min_adjuvant_score?: number
          p_need_slug: string
          p_stage: string
        }
        Returns: {
          average_rating: number
          image_url: string
          name: string
          price_cop: number
          product_id: string
          reason: string
          review_count: number
          rnk: number
          score: number
          slug: string
          tier: string
        }[]
      }
      savia_claim_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          flow_id: string | null
          flow_step_id: string | null
          id: string
          idempotency_key: string | null
          last_error: string | null
          message_id: string | null
          payload: Json
          scheduled_at: string
          status: string
          subject: string
          template: string
          to_email: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      savia_lifecycle_candidates: {
        Args: { p_max_days: number; p_min_days: number }
        Returns: {
          customer_id: string
          email: string
          full_name: string
          last_order_at: string
          last_order_id: string
          last_total_cop: number
        }[]
      }
      rewire_visitor_to_customer: {
        Args: { p_visitor_id: string; p_customer_id: string }
        Returns: number
      }
      savia_trigger_cart_detect: { Args: never; Returns: number }
      savia_trigger_dispatch: { Args: never; Returns: number }
      savia_flow_attribution: {
        Args: { p_days?: number; p_attribution_window_days?: number }
        Returns: {
          flow_id: string
          flow_name: string
          emails_sent: number
          emails_opened: number
          emails_clicked: number
          attributed_orders: number
          attributed_revenue_cop: number
          open_rate_pct: number | null
          ctr_pct: number | null
          revenue_per_send_cop: number | null
          as_of: string
        }[]
      }
      coupon_performance: {
        Args: { p_days?: number }
        Returns: {
          coupon_id: string
          code: string
          description: string
          redemptions: number
          unique_customers: number
          revenue_cop: number
          discount_total_cop: number
          aov_with_coupon_cop: number
          discount_pct_of_revenue: number
          as_of: string
        }[]
      }
      tracking_wishlist_gap: {
        Args: { p_days?: number }
        Returns: {
          product_id: string
          product_slug: string
          product_name: string
          image_url: string | null
          wishlist_adds: number
          unique_wishers: number
          paid_orders: number
          conversion_pct: number | null
          as_of: string
        }[]
      }
      tracking_acquisition_overview: {
        Args: { p_days: number }
        Returns: {
          utm_source: string
          sessions: number
          visitors: number
          last_touch_orders: number
          last_touch_revenue_cop: number
          first_touch_orders: number
          first_touch_revenue_cop: number
          conv_last_touch_pct: number | null
          conv_first_touch_pct: number | null
          as_of: string
        }[]
      }
      tracking_funnel_overview: {
        Args: { p_days: number }
        Returns: {
          step_order: number
          step_event_type: string
          visitors: number
          pct_of_previous: number | null
          pct_of_total: number | null
          as_of: string
        }[]
      }
      tracking_top_landings: {
        Args: { p_days: number; p_limit?: number }
        Returns: {
          page_path: string
          sessions: number
          bounce_sessions: number
          orders: number
          conv_pct: number | null
          as_of: string
        }[]
      }
      tracking_product_funnel: {
        Args: { p_days: number }
        Returns: {
          product_id: string | null
          product_slug: string
          product_name: string
          image_url: string | null
          views: number
          adds_to_cart: number
          unique_buyers: number
          units_sold: number
          revenue_cop: number
          conv_view_to_cart: number | null
          conv_view_to_purchase: number | null
        }[]
      }
      savia_trigger_lifecycle_detect: { Args: never; Returns: number }
      search_products: {
        Args: { page_offset?: number; page_size?: number; q: string }
        Returns: {
          id: string
          rank: number
        }[]
      }
      trigger_quiz_reco_sync: { Args: { p_source?: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
