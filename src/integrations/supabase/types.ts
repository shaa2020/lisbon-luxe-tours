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
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          ip: string | null
          key_prefix: string | null
          method: string
          path: string
          status: number
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          key_prefix?: string | null
          method: string
          path: string
          status: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          key_prefix?: string | null
          method?: string
          path?: string
          status?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          category: string
          comments: number
          content: Json
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          published: boolean
          published_at: string
          read_time: string
          shares: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          comments?: number
          content?: Json
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string
          read_time?: string
          shares?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          comments?: number
          content?: Json
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string
          read_time?: string
          shares?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_events: {
        Row: {
          actor: string | null
          booking_id: string
          created_at: string
          detail: Json | null
          id: string
          kind: string
          summary: string
        }
        Insert: {
          actor?: string | null
          booking_id: string
          created_at?: string
          detail?: Json | null
          id?: string
          kind: string
          summary: string
        }
        Update: {
          actor?: string | null
          booking_id?: string
          created_at?: string
          detail?: Json | null
          id?: string
          kind?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_modifications: {
        Row: {
          booking_id: string
          change_type: string
          created_at: string
          difference_cents: number
          id: string
          new_value: Json
          notes: string | null
          old_value: Json
          payment_status: string
          status: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          change_type: string
          created_at?: string
          difference_cents?: number
          id?: string
          new_value?: Json
          notes?: string | null
          old_value?: Json
          payment_status?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          change_type?: string
          created_at?: string
          difference_cents?: number
          id?: string
          new_value?: Json
          notes?: string | null
          old_value?: Json
          payment_status?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_modifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_total: number | null
          auto_emails_opt_out: boolean
          cancel_reason: string | null
          created_at: string
          custom_selections: Json | null
          customer_name: string
          discount_cents: number
          discount_code: string | null
          email: string
          guests: number
          id: string
          internal_notes: string | null
          notes: string | null
          payment_request_cents: number | null
          payment_status: string
          phone: string | null
          refund_cents: number
          reminder_sent_at: string | null
          review_request_sent_at: string | null
          source: string
          status: string
          total_estimate: number | null
          tour_slug: string | null
          tour_title: string | null
          travel_date: string | null
          travel_time: string | null
        }
        Insert: {
          amount_total?: number | null
          auto_emails_opt_out?: boolean
          cancel_reason?: string | null
          created_at?: string
          custom_selections?: Json | null
          customer_name: string
          discount_cents?: number
          discount_code?: string | null
          email: string
          guests?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_request_cents?: number | null
          payment_status?: string
          phone?: string | null
          refund_cents?: number
          reminder_sent_at?: string | null
          review_request_sent_at?: string | null
          source?: string
          status?: string
          total_estimate?: number | null
          tour_slug?: string | null
          tour_title?: string | null
          travel_date?: string | null
          travel_time?: string | null
        }
        Update: {
          amount_total?: number | null
          auto_emails_opt_out?: boolean
          cancel_reason?: string | null
          created_at?: string
          custom_selections?: Json | null
          customer_name?: string
          discount_cents?: number
          discount_code?: string | null
          email?: string
          guests?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_request_cents?: number | null
          payment_status?: string
          phone?: string | null
          refund_cents?: number
          reminder_sent_at?: string | null
          review_request_sent_at?: string | null
          source?: string
          status?: string
          total_estimate?: number | null
          tour_slug?: string | null
          tour_title?: string | null
          travel_date?: string | null
          travel_time?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          external_id: string | null
          id: string
          language: string | null
          message_type: string
          metadata: Json | null
          sender: string
          sent_at: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          language?: string | null
          message_type?: string
          metadata?: Json | null
          sender?: string
          sent_at?: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          language?: string | null
          message_type?: string
          metadata?: Json | null
          sender?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          display_name: string | null
          external_id: string | null
          handled_by: string
          id: string
          language: string
          last_message_at: string | null
          phone: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          external_id?: string | null
          handled_by?: string
          id?: string
          language?: string
          last_message_at?: string | null
          phone: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          external_id?: string | null
          handled_by?: string
          id?: string
          language?: string
          last_message_at?: string | null
          phone?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ops_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tour_components: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          extra_per_guest_cents: number
          id: string
          image_url: string | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description?: string | null
          extra_per_guest_cents?: number
          id?: string
          image_url?: string | null
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          extra_per_guest_cents?: number
          id?: string
          image_url?: string | null
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          expires_at: string | null
          id: string
          max_uses: number | null
          min_guests: number
          starts_at: string | null
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_guests?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_guests?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          amount_cents: number
          booking_id: string | null
          code: string
          code_id: string
          created_at: string
          id: string
        }
        Insert: {
          amount_cents?: number
          booking_id?: string | null
          code: string
          code_id: string
          created_at?: string
          id?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          code?: string
          code_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          heading: string
          id: string
          intro: string
          key: string
          label: string
          outro: string
          show_booking_details: boolean
          sort_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          heading: string
          id?: string
          intro: string
          key: string
          label: string
          outro?: string
          show_booking_details?: boolean
          sort_order?: number
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          heading?: string
          id?: string
          intro?: string
          key?: string
          label?: string
          outro?: string
          show_booking_details?: boolean
          sort_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          language: string
          message: string | null
          name: string | null
          notes: string | null
          number_of_people: number | null
          phone: string | null
          preferred_date: string | null
          preferred_time: string | null
          source: string
          status: string
          tour_id: string | null
          tour_slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          language?: string
          message?: string | null
          name?: string | null
          notes?: string | null
          number_of_people?: number | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          source?: string
          status?: string
          tour_id?: string | null
          tour_slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          language?: string
          message?: string | null
          name?: string | null
          notes?: string | null
          number_of_people?: number | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          source?: string
          status?: string
          tour_id?: string | null
          tour_slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ops_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_booking_activities: {
        Row: {
          action: string
          actor: string | null
          booking_id: string
          created_at: string
          detail: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          booking_id: string
          created_at?: string
          detail?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          booking_id?: string
          created_at?: string
          detail?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_booking_activities_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "ops_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_bookings: {
        Row: {
          adults: number
          base_price: number
          children: number
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          deposit_paid: number
          deposit_required: number
          discount: number
          driver_id: string | null
          dropoff_location: string | null
          duration_hours: number
          extra_charges: number
          guests: number
          guide_id: string | null
          id: string
          internal_notes: string | null
          partner_id: string | null
          payment_method: string | null
          payment_status: string
          pickup_location: string | null
          reference: string
          source_booking_id: string | null
          special_requests: string | null
          start_time: string
          status: string
          total: number
          tour_date: string
          tour_id: string | null
          tour_name: string
          updated_at: string
          vehicle_charges: number
          vehicle_id: string | null
          vehicle_qty: number
          vehicle_type: string
        }
        Insert: {
          adults?: number
          base_price?: number
          children?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          deposit_paid?: number
          deposit_required?: number
          discount?: number
          driver_id?: string | null
          dropoff_location?: string | null
          duration_hours?: number
          extra_charges?: number
          guests?: number
          guide_id?: string | null
          id?: string
          internal_notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_location?: string | null
          reference: string
          source_booking_id?: string | null
          special_requests?: string | null
          start_time?: string
          status?: string
          total?: number
          tour_date: string
          tour_id?: string | null
          tour_name: string
          updated_at?: string
          vehicle_charges?: number
          vehicle_id?: string | null
          vehicle_qty?: number
          vehicle_type?: string
        }
        Update: {
          adults?: number
          base_price?: number
          children?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          deposit_paid?: number
          deposit_required?: number
          discount?: number
          driver_id?: string | null
          dropoff_location?: string | null
          duration_hours?: number
          extra_charges?: number
          guests?: number
          guide_id?: string | null
          id?: string
          internal_notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_location?: string | null
          reference?: string
          source_booking_id?: string | null
          special_requests?: string | null
          start_time?: string
          status?: string
          total?: number
          tour_date?: string
          tour_id?: string | null
          tour_name?: string
          updated_at?: string
          vehicle_charges?: number
          vehicle_id?: string | null
          vehicle_qty?: number
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ops_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_bookings_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_bookings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ops_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_bookings_source_booking_id_fkey"
            columns: ["source_booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "ops_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "ops_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_change_requests: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          message: string
          request_type: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message: string
          request_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string
          request_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_change_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "ops_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_customers: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      ops_partners: {
        Row: {
          commission_percent: number
          company: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          partner_type: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          commission_percent?: number
          company: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          partner_type?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          commission_percent?: number
          company?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          partner_type?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      ops_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: string
          notes: string | null
          paid_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "ops_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_settings: {
        Row: {
          business_email: string | null
          business_name: string
          business_phone: string | null
          created_at: string
          currency: string
          default_duration_hours: number
          default_start_time: string
          deposit_percent: number
          id: boolean
          updated_at: string
        }
        Insert: {
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          created_at?: string
          currency?: string
          default_duration_hours?: number
          default_start_time?: string
          deposit_percent?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          created_at?: string
          currency?: string
          default_duration_hours?: number
          default_start_time?: string
          deposit_percent?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ops_staff: {
        Row: {
          created_at: string
          id: string
          languages: string[]
          name: string
          notes: string | null
          phone: string | null
          role: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          languages?: string[]
          name: string
          notes?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          languages?: string[]
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      ops_tours: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          duration_hours: number
          excluded: string[]
          full_description: string | null
          id: string
          image_url: string | null
          included: string[]
          max_guests: number
          name: string
          pickup_available: boolean
          short_description: string | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          created_at?: string
          duration_hours?: number
          excluded?: string[]
          full_description?: string | null
          id?: string
          image_url?: string | null
          included?: string[]
          max_guests?: number
          name: string
          pickup_available?: boolean
          short_description?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          duration_hours?: number
          excluded?: string[]
          full_description?: string | null
          id?: string
          image_url?: string | null
          included?: string[]
          max_guests?: number
          name?: string
          pickup_available?: boolean
          short_description?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      ops_vehicles: {
        Row: {
          capacity: number
          created_at: string
          driver_id: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver_id?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          driver_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "ops_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_total: number
          booking_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          guests: number | null
          id: string
          payment_status: string
          provider: string
          raw: Json | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tour_slug: string | null
          tour_title: string | null
          travel_date: string | null
          updated_at: string
        }
        Insert: {
          amount_total?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          guests?: number | null
          id?: string
          payment_status?: string
          provider?: string
          raw?: Json | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tour_slug?: string | null
          tour_title?: string | null
          travel_date?: string | null
          updated_at?: string
        }
        Update: {
          amount_total?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          guests?: number | null
          id?: string
          payment_status?: string
          provider?: string
          raw?: Json | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tour_slug?: string | null
          tour_title?: string | null
          travel_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_secrets: {
        Row: {
          created_at: string
          id: string
          mode: string
          provider: string
          secrets_ciphertext: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          provider: string
          secrets_ciphertext: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          provider?: string
          secrets_ciphertext?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json
          created_at: string
          id: string
          installed: boolean
          is_active: boolean
          label: string
          last_check_message: string | null
          last_check_ok: boolean | null
          last_checked_at: string | null
          mode: string
          provider: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          installed?: boolean
          is_active?: boolean
          label: string
          last_check_message?: string | null
          last_check_ok?: boolean | null
          last_checked_at?: string | null
          mode?: string
          provider: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          installed?: boolean
          is_active?: boolean
          label?: string
          last_check_message?: string | null
          last_check_ok?: boolean | null
          last_checked_at?: string | null
          mode?: string
          provider?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_email: string | null
          author_name: string
          author_photo_url: string | null
          body: string
          created_at: string
          featured: boolean
          id: string
          rating: number
          source: string
          source_url: string | null
          status: string
          title: string | null
          tour_id: string | null
          tour_slug: string | null
          travel_date: string | null
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_name: string
          author_photo_url?: string | null
          body: string
          created_at?: string
          featured?: boolean
          id?: string
          rating: number
          source?: string
          source_url?: string | null
          status?: string
          title?: string | null
          tour_id?: string | null
          tour_slug?: string | null
          travel_date?: string | null
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_name?: string
          author_photo_url?: string | null
          body?: string
          created_at?: string
          featured?: boolean
          id?: string
          rating?: number
          source?: string
          source_url?: string | null
          status?: string
          title?: string | null
          tour_id?: string | null
          tour_slug?: string | null
          travel_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          about_image_url: string | null
          address_line1: string | null
          address_line2: string | null
          auto_reminder_enabled: boolean
          auto_review_request_enabled: boolean
          brand_name: string
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          custom_tour_eyebrow: string | null
          custom_tour_subtitle: string | null
          custom_tour_title: string | null
          daily_slot_capacity: number
          exit_popup_code: string | null
          exit_popup_cta_label: string | null
          exit_popup_enabled: boolean
          exit_popup_headline: string | null
          exit_popup_subtext: string | null
          facebook_url: string | null
          footer_legal: string | null
          footer_tagline: string | null
          google_review_url: string | null
          group_discount_enabled: boolean
          group_discount_tiers: Json
          hero_image_url: string | null
          hero_slides: Json
          hotel_pickup_fee_cents: number
          id: boolean
          instagram_url: string | null
          logo_url: string | null
          offer_bar_code: string | null
          offer_bar_enabled: boolean
          offer_bar_text: string
          owner_notification_email: string
          payment_provider: string
          payments_enabled: boolean
          payments_maintenance_message: string
          promo_banner_code: string | null
          promo_banner_cta_label: string | null
          promo_banner_cta_url: string | null
          promo_banner_enabled: boolean
          promo_banner_ends_at: string | null
          promo_banner_headline: string | null
          promo_banner_starts_at: string | null
          promo_banner_subtext: string | null
          promo_banner_theme: string
          twitter_url: string | null
          updated_at: string
          whatsapp_phone: string | null
          whatsapp_reply_line: string
        }
        Insert: {
          about_image_url?: string | null
          address_line1?: string | null
          address_line2?: string | null
          auto_reminder_enabled?: boolean
          auto_review_request_enabled?: boolean
          brand_name?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          custom_tour_eyebrow?: string | null
          custom_tour_subtitle?: string | null
          custom_tour_title?: string | null
          daily_slot_capacity?: number
          exit_popup_code?: string | null
          exit_popup_cta_label?: string | null
          exit_popup_enabled?: boolean
          exit_popup_headline?: string | null
          exit_popup_subtext?: string | null
          facebook_url?: string | null
          footer_legal?: string | null
          footer_tagline?: string | null
          google_review_url?: string | null
          group_discount_enabled?: boolean
          group_discount_tiers?: Json
          hero_image_url?: string | null
          hero_slides?: Json
          hotel_pickup_fee_cents?: number
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          offer_bar_code?: string | null
          offer_bar_enabled?: boolean
          offer_bar_text?: string
          owner_notification_email?: string
          payment_provider?: string
          payments_enabled?: boolean
          payments_maintenance_message?: string
          promo_banner_code?: string | null
          promo_banner_cta_label?: string | null
          promo_banner_cta_url?: string | null
          promo_banner_enabled?: boolean
          promo_banner_ends_at?: string | null
          promo_banner_headline?: string | null
          promo_banner_starts_at?: string | null
          promo_banner_subtext?: string | null
          promo_banner_theme?: string
          twitter_url?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
          whatsapp_reply_line?: string
        }
        Update: {
          about_image_url?: string | null
          address_line1?: string | null
          address_line2?: string | null
          auto_reminder_enabled?: boolean
          auto_review_request_enabled?: boolean
          brand_name?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          custom_tour_eyebrow?: string | null
          custom_tour_subtitle?: string | null
          custom_tour_title?: string | null
          daily_slot_capacity?: number
          exit_popup_code?: string | null
          exit_popup_cta_label?: string | null
          exit_popup_enabled?: boolean
          exit_popup_headline?: string | null
          exit_popup_subtext?: string | null
          facebook_url?: string | null
          footer_legal?: string | null
          footer_tagline?: string | null
          google_review_url?: string | null
          group_discount_enabled?: boolean
          group_discount_tiers?: Json
          hero_image_url?: string | null
          hero_slides?: Json
          hotel_pickup_fee_cents?: number
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          offer_bar_code?: string | null
          offer_bar_enabled?: boolean
          offer_bar_text?: string
          owner_notification_email?: string
          payment_provider?: string
          payments_enabled?: boolean
          payments_maintenance_message?: string
          promo_banner_code?: string | null
          promo_banner_cta_label?: string | null
          promo_banner_cta_url?: string | null
          promo_banner_enabled?: boolean
          promo_banner_ends_at?: string | null
          promo_banner_headline?: string | null
          promo_banner_starts_at?: string | null
          promo_banner_subtext?: string | null
          promo_banner_theme?: string
          twitter_url?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
          whatsapp_reply_line?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          category: string
          category_slug: string
          created_at: string
          description: string
          duration: string
          featured: boolean
          highlights: Json
          id: string
          image_url: string | null
          included: Json
          itinerary: Json
          not_included: Json
          per_person_pricing: boolean
          price_from: number
          published: boolean
          sale_price: number | null
          slug: string
          sort_order: number
          tagline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          category_slug: string
          created_at?: string
          description?: string
          duration: string
          featured?: boolean
          highlights?: Json
          id?: string
          image_url?: string | null
          included?: Json
          itinerary?: Json
          not_included?: Json
          per_person_pricing?: boolean
          price_from?: number
          published?: boolean
          sale_price?: number | null
          slug: string
          sort_order?: number
          tagline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          category_slug?: string
          created_at?: string
          description?: string
          duration?: string
          featured?: boolean
          highlights?: Json
          id?: string
          image_url?: string | null
          included?: Json
          itinerary?: Json
          not_included?: Json
          per_person_pricing?: boolean
          price_from?: number
          published?: boolean
          sale_price?: number | null
          slug?: string
          sort_order?: number
          tagline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      travel_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          meta_description: string | null
          name: string
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          name: string
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          name?: string
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      travel_guide_faqs: {
        Row: {
          answer: string
          created_at: string
          guide_id: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          guide_id: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          guide_id?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_guide_faqs_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "travel_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_guide_redirects: {
        Row: {
          created_at: string
          from_path: string
          id: string
          redirect_type: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          redirect_type?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          redirect_type?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      travel_guide_related_articles: {
        Row: {
          guide_id: string
          related_guide_id: string
          sort_order: number
        }
        Insert: {
          guide_id: string
          related_guide_id: string
          sort_order?: number
        }
        Update: {
          guide_id?: string
          related_guide_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "travel_guide_related_articles_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "travel_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_guide_related_articles_related_guide_id_fkey"
            columns: ["related_guide_id"]
            isOneToOne: false
            referencedRelation: "travel_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_guide_related_tours: {
        Row: {
          guide_id: string
          sort_order: number
          tour_id: string
        }
        Insert: {
          guide_id: string
          sort_order?: number
          tour_id: string
        }
        Update: {
          guide_id?: string
          sort_order?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_guide_related_tours_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "travel_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_guide_related_tours_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_guide_tags: {
        Row: {
          guide_id: string
          tag_id: string
        }
        Insert: {
          guide_id: string
          tag_id: string
        }
        Update: {
          guide_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_guide_tags_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "travel_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_guide_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "travel_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_guides: {
        Row: {
          author: string
          canonical_url: string | null
          category_id: string | null
          content: Json
          content_updated_at: string | null
          created_at: string
          excerpt: string
          featured: boolean
          featured_order: number
          hero_image_alt: string | null
          hero_image_caption: string | null
          hero_image_url: string | null
          id: string
          locale: string
          meta_description: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          quick_answer: string | null
          reading_time: number
          robots: string
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: Json
          content_updated_at?: string | null
          created_at?: string
          excerpt?: string
          featured?: boolean
          featured_order?: number
          hero_image_alt?: string | null
          hero_image_caption?: string | null
          hero_image_url?: string | null
          id?: string
          locale?: string
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          quick_answer?: string | null
          reading_time?: number
          robots?: string
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: Json
          content_updated_at?: string | null
          created_at?: string
          excerpt?: string
          featured?: boolean
          featured_order?: number
          hero_image_alt?: string | null
          hero_image_caption?: string | null
          hero_image_url?: string | null
          id?: string
          locale?: string
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          quick_answer?: string | null
          reading_time?: number
          robots?: string
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_guides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "travel_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
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
      reviews_public: {
        Row: {
          author_name: string | null
          author_photo_url: string | null
          body: string | null
          created_at: string | null
          featured: boolean | null
          id: string | null
          rating: number | null
          source: string | null
          source_url: string | null
          status: string | null
          title: string | null
          tour_id: string | null
          tour_slug: string | null
          travel_date: string | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          author_photo_url?: string | null
          body?: string | null
          created_at?: string | null
          featured?: boolean | null
          id?: string | null
          rating?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          title?: string | null
          tour_id?: string | null
          tour_slug?: string | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          author_photo_url?: string | null
          body?: string | null
          created_at?: string | null
          featured?: boolean | null
          id?: string | null
          rating?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          title?: string | null
          tour_id?: string | null
          tour_slug?: string | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      role_rank: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "manager" | "staff"
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
      app_role: ["admin", "owner", "manager", "staff"],
    },
  },
} as const
