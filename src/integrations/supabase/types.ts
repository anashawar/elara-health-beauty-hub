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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null
          area: string | null
          building: string | null
          city: string
          created_at: string
          floor: string | null
          id: string
          is_default: boolean | null
          label: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment?: string | null
          area?: string | null
          building?: string | null
          city: string
          created_at?: string
          floor?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment?: string | null
          area?: string | null
          building?: string | null
          city?: string
          created_at?: string
          floor?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          image_url_ar: string | null
          image_url_ku: string | null
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_ku: string | null
          title: string | null
          title_ar: string | null
          title_ku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          image_url_ar?: string | null
          image_url_ku?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          subtitle_ar?: string | null
          subtitle_ku?: string | null
          title?: string | null
          title_ar?: string | null
          title_ku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          image_url_ar?: string | null
          image_url_ku?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          subtitle_ar?: string | null
          subtitle_ku?: string | null
          title?: string | null
          title_ar?: string | null
          title_ku?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          country_of_origin: string | null
          created_at: string
          featured: boolean
          id: string
          logo_url: string | null
          name: string
          name_ar: string | null
          name_ku: string | null
          slug: string
        }
        Insert: {
          country_of_origin?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          logo_url?: string | null
          name: string
          name_ar?: string | null
          name_ku?: string | null
          slug: string
        }
        Update: {
          country_of_origin?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          name_ku?: string | null
          slug?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          name_ar: string | null
          name_ku: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_ar?: string | null
          name_ku?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          name_ku?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
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
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          influencer_commission: number | null
          influencer_name: string | null
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          influencer_commission?: number | null
          influencer_name?: string | null
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          influencer_commission?: number | null
          influencer_name?: string | null
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
        }
        Relationships: []
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
      loyalty_points: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_redeemed: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_redeemed?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_redeemed?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          id: string
          points_spent: number
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_spent: number
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          description_ku: string | null
          id: string
          image_url: string | null
          is_active: boolean
          points_cost: number
          reward_type: string
          reward_value: number | null
          sort_order: number | null
          stock: number | null
          title: string
          title_ar: string | null
          title_ku: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_ku?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          points_cost: number
          reward_type?: string
          reward_value?: number | null
          sort_order?: number | null
          stock?: number | null
          title: string
          title_ar?: string | null
          title_ku?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_ku?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          points_cost?: number
          reward_type?: string
          reward_value?: number | null
          sort_order?: number | null
          stock?: number | null
          title?: string
          title_ar?: string | null
          title_ku?: string | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          image_url: string | null
          link_url: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          target_ids: string[] | null
          target_type: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_ids?: string[] | null
          target_type?: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_ids?: string[] | null
          target_type?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_read: boolean
          link_url: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          link_url?: string | null
          metadata?: Json | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          link_url?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          banner_style: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          image_url: string | null
          image_url_ar: string | null
          image_url_ku: string | null
          is_active: boolean
          link_url: string | null
          show_as_banner: boolean
          sort_order: number | null
          starts_at: string | null
          subtitle: string | null
          target_id: string | null
          target_name: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_style?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          image_url_ar?: string | null
          image_url_ku?: string | null
          is_active?: boolean
          link_url?: string | null
          show_as_banner?: boolean
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_style?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          image_url_ar?: string | null
          image_url_ku?: string | null
          is_active?: boolean
          link_url?: string | null
          show_as_banner?: boolean
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
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
        ]
      }
      order_ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_time_rating: number | null
          expectation_rating: number | null
          id: string
          order_id: string
          overall_rating: number | null
          price_rating: number | null
          quality_rating: number | null
          service_rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_time_rating?: number | null
          expectation_rating?: number | null
          id?: string
          order_id: string
          overall_rating?: number | null
          price_rating?: number | null
          quality_rating?: number | null
          service_rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_time_rating?: number | null
          expectation_rating?: number | null
          id?: string
          order_id?: string
          overall_rating?: number | null
          price_rating?: number | null
          quality_rating?: number | null
          service_rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          coupon_code: string | null
          created_at: string
          delivery_fee: number
          discount: number
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          coupon_code?: string | null
          created_at?: string
          delivery_fee?: number
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          coupon_code?: string | null
          created_at?: string
          delivery_fee?: number
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      prep_access_tokens: {
        Row: {
          created_at: string
          created_by: string
          excluded_brand_ids: string[]
          excluded_product_ids: string[]
          id: string
          is_active: boolean
          label: string
          password_hash: string
          token: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by: string
          excluded_brand_ids?: string[]
          excluded_product_ids?: string[]
          id?: string
          is_active?: boolean
          label?: string
          password_hash: string
          token?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string
          excluded_brand_ids?: string[]
          excluded_product_ids?: string[]
          id?: string
          is_active?: boolean
          label?: string
          password_hash?: string
          token?: string
          username?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          cost: number
          created_at: string
          id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          id: string
          product_id: string
          tag: string
        }
        Insert: {
          id?: string
          product_id: string
          tag: string
        }
        Update: {
          id?: string
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          application: string | null
          benefits: string[] | null
          benefits_ar: string[] | null
          benefits_ku: string[] | null
          brand_id: string | null
          category_id: string | null
          condition: string | null
          country_of_origin: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          description_ku: string | null
          form: string | null
          gender: string | null
          id: string
          in_stock: boolean
          is_new: boolean | null
          is_pick: boolean | null
          is_trending: boolean | null
          original_price: number | null
          price: number
          skin_type: string | null
          slug: string
          subcategory_id: string | null
          title: string
          title_ar: string | null
          title_ku: string | null
          updated_at: string
          usage_instructions: string | null
          usage_instructions_ar: string | null
          usage_instructions_ku: string | null
          volume_ml: string | null
          volume_unit: string | null
        }
        Insert: {
          application?: string | null
          benefits?: string[] | null
          benefits_ar?: string[] | null
          benefits_ku?: string[] | null
          brand_id?: string | null
          category_id?: string | null
          condition?: string | null
          country_of_origin?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_ku?: string | null
          form?: string | null
          gender?: string | null
          id?: string
          in_stock?: boolean
          is_new?: boolean | null
          is_pick?: boolean | null
          is_trending?: boolean | null
          original_price?: number | null
          price: number
          skin_type?: string | null
          slug: string
          subcategory_id?: string | null
          title: string
          title_ar?: string | null
          title_ku?: string | null
          updated_at?: string
          usage_instructions?: string | null
          usage_instructions_ar?: string | null
          usage_instructions_ku?: string | null
          volume_ml?: string | null
          volume_unit?: string | null
        }
        Update: {
          application?: string | null
          benefits?: string[] | null
          benefits_ar?: string[] | null
          benefits_ku?: string[] | null
          brand_id?: string | null
          category_id?: string | null
          condition?: string | null
          country_of_origin?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_ku?: string | null
          form?: string | null
          gender?: string | null
          id?: string
          in_stock?: boolean
          is_new?: boolean | null
          is_pick?: boolean | null
          is_trending?: boolean | null
          original_price?: number | null
          price?: number
          skin_type?: string | null
          slug?: string
          subcategory_id?: string | null
          title?: string
          title_ar?: string | null
          title_ku?: string | null
          updated_at?: string
          usage_instructions?: string | null
          usage_instructions_ar?: string | null
          usage_instructions_ku?: string | null
          volume_ml?: string | null
          volume_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthdate: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_name: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_name?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_analyses: {
        Row: {
          clarity_score: number | null
          created_at: string
          elasticity_score: number | null
          full_analysis: Json | null
          hydration_score: number | null
          id: string
          image_url: string | null
          overall_score: number
          problems: Json | null
          recommended_product_ids: string[] | null
          routine: Json | null
          skin_type: string | null
          texture_score: number | null
          user_id: string
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          elasticity_score?: number | null
          full_analysis?: Json | null
          hydration_score?: number | null
          id?: string
          image_url?: string | null
          overall_score?: number
          problems?: Json | null
          recommended_product_ids?: string[] | null
          routine?: Json | null
          skin_type?: string | null
          texture_score?: number | null
          user_id: string
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          elasticity_score?: number | null
          full_analysis?: Json | null
          hydration_score?: number | null
          id?: string
          image_url?: string | null
          overall_score?: number
          problems?: Json | null
          recommended_product_ids?: string[] | null
          routine?: Json | null
          skin_type?: string | null
          texture_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          icon: string | null
          id: string
          name: string
          name_ar: string | null
          name_ku: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_ar?: string | null
          name_ku?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          name_ku?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          closed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          last_message_at: string
          rating: number | null
          resolution: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          last_message_at?: string
          rating?: number | null
          resolution?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          last_message_at?: string
          rating?: number | null
          resolution?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_loyalty_points: {
        Args: {
          _description: string
          _points: number
          _reference_id?: string
          _user_id: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      redeem_loyalty_points: {
        Args: {
          _description: string
          _points: number
          _reference_id?: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "operations" | "data_entry"
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
      app_role: ["admin", "moderator", "user", "operations", "data_entry"],
    },
  },
} as const
