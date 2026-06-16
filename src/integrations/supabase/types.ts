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
      bookings: {
        Row: {
          amount_total: number | null
          created_at: string
          customer_name: string
          email: string
          guests: number
          id: string
          notes: string | null
          payment_status: string
          phone: string | null
          status: string
          total_estimate: number | null
          tour_slug: string | null
          tour_title: string | null
          travel_date: string | null
        }
        Insert: {
          amount_total?: number | null
          created_at?: string
          customer_name: string
          email: string
          guests?: number
          id?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          status?: string
          total_estimate?: number | null
          tour_slug?: string | null
          tour_title?: string | null
          travel_date?: string | null
        }
        Update: {
          amount_total?: number | null
          created_at?: string
          customer_name?: string
          email?: string
          guests?: number
          id?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          status?: string
          total_estimate?: number | null
          tour_slug?: string | null
          tour_title?: string | null
          travel_date?: string | null
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
      reviews: {
        Row: {
          author_email: string | null
          author_name: string
          body: string
          created_at: string
          featured: boolean
          id: string
          rating: number
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
          body: string
          created_at?: string
          featured?: boolean
          id?: string
          rating: number
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
          body?: string
          created_at?: string
          featured?: boolean
          id?: string
          rating?: number
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
          address_line1: string | null
          address_line2: string | null
          brand_name: string
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          facebook_url: string | null
          footer_legal: string | null
          footer_tagline: string | null
          id: boolean
          instagram_url: string | null
          logo_url: string | null
          twitter_url: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          brand_name?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          facebook_url?: string | null
          footer_legal?: string | null
          footer_tagline?: string | null
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          brand_name?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          facebook_url?: string | null
          footer_legal?: string | null
          footer_tagline?: string | null
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
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
          body: string | null
          created_at: string | null
          featured: boolean | null
          id: string | null
          rating: number | null
          status: string | null
          title: string | null
          tour_id: string | null
          tour_slug: string | null
          travel_date: string | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string | null
          featured?: boolean | null
          id?: string | null
          rating?: number | null
          status?: string | null
          title?: string | null
          tour_id?: string | null
          tour_slug?: string | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string | null
          featured?: boolean | null
          id?: string | null
          rating?: number | null
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
