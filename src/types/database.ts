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
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_role: string | null
          changed_fields: string[] | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_role?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_role?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          created_at: string | null
          floors: number | null
          id: string
          name: string
          notes: string | null
          project_id: string
        }
        Insert: {
          created_at?: string | null
          floors?: number | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
        }
        Update: {
          created_at?: string | null
          floors?: number | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          kennitala: string | null
          name: string
          notes: string | null
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          kennitala?: string | null
          name: string
          notes?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          kennitala?: string | null
          name?: string
          notes?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          arrived_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          delivery_photo_url: string | null
          departed_at: string | null
          driver_id: string | null
          id: string
          loading_started_at: string | null
          notes: string | null
          planned_date: string | null
          project_id: string
          received_by_name: string | null
          received_by_signature_url: string | null
          status: string | null
          truck_description: string | null
          truck_registration: string | null
          updated_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_photo_url?: string | null
          departed_at?: string | null
          driver_id?: string | null
          id?: string
          loading_started_at?: string | null
          notes?: string | null
          planned_date?: string | null
          project_id: string
          received_by_name?: string | null
          received_by_signature_url?: string | null
          status?: string | null
          truck_description?: string | null
          truck_registration?: string | null
          updated_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_photo_url?: string | null
          departed_at?: string | null
          driver_id?: string | null
          id?: string
          loading_started_at?: string | null
          notes?: string | null
          planned_date?: string | null
          project_id?: string
          received_by_name?: string | null
          received_by_signature_url?: string | null
          status?: string | null
          truck_description?: string | null
          truck_registration?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivery_id: string
          element_id: string
          id: string
          load_position: string | null
          loaded_at: string | null
          loaded_by: string | null
          notes: string | null
          received_photo_url: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_id: string
          element_id: string
          id?: string
          load_position?: string | null
          loaded_at?: string | null
          loaded_by?: string | null
          notes?: string | null
          received_photo_url?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_id?: string
          element_id?: string
          id?: string
          load_position?: string | null
          loaded_at?: string | null
          loaded_by?: string | null
          notes?: string | null
          received_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_loaded_by_fkey"
            columns: ["loaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          content: string
          created_at: string | null
          entry_date: string
          id: string
          project_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entry_date?: string
          id?: string
          project_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          project_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      element_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          element_id: string
          id: string
          notes: string | null
          previous_status: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          element_id: string
          id?: string
          notes?: string | null
          previous_status?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          element_id?: string
          id?: string
          notes?: string | null
          previous_status?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "element_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "element_events_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
        ]
      }
      element_photos: {
        Row: {
          caption: string | null
          element_id: string
          id: string
          photo_url: string
          stage: string
          taken_at: string | null
          taken_by: string | null
        }
        Insert: {
          caption?: string | null
          element_id: string
          id?: string
          photo_url: string
          stage: string
          taken_at?: string | null
          taken_by?: string | null
        }
        Update: {
          caption?: string | null
          element_id?: string
          id?: string
          photo_url?: string
          stage?: string
          taken_at?: string | null
          taken_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "element_photos_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "element_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      element_positions: {
        Row: {
          created_at: string | null
          element_id: string
          floor_plan_id: string
          id: string
          label: string | null
          rotation_degrees: number | null
          x_percent: number
          y_percent: number
        }
        Insert: {
          created_at?: string | null
          element_id: string
          floor_plan_id: string
          id?: string
          label?: string | null
          rotation_degrees?: number | null
          x_percent: number
          y_percent: number
        }
        Update: {
          created_at?: string | null
          element_id?: string
          floor_plan_id?: string
          id?: string
          label?: string | null
          rotation_degrees?: number | null
          x_percent?: number
          y_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "element_positions_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "element_positions_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      element_types: {
        Row: {
          id: string
          key: string
          label_is: string
          label_en: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label_is: string
          label_en: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label_is?: string
          label_en?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      elements: {
        Row: {
          batch_number: string | null
          building_id: string | null
          cast_at: string | null
          created_at: string | null
          created_by: string | null
          curing_completed_at: string | null
          delivered_at: string | null
          delivery_notes: string | null
          drawing_reference: string | null
          element_type: string
          floor: number | null
          height_mm: number | null
          id: string
          length_mm: number | null
          loaded_at: string | null
          name: string
          position_description: string | null
          priority: number | null
          production_notes: string | null
          project_id: string
          qr_code_url: string | null
          ready_at: string | null
          rebar_completed_at: string | null
          status: string | null
          updated_at: string | null
          weight_kg: number | null
          width_mm: number | null
        }
        Insert: {
          batch_number?: string | null
          building_id?: string | null
          cast_at?: string | null
          created_at?: string | null
          created_by?: string | null
          curing_completed_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          drawing_reference?: string | null
          element_type: string
          floor?: number | null
          height_mm?: number | null
          id?: string
          length_mm?: number | null
          loaded_at?: string | null
          name: string
          position_description?: string | null
          priority?: number | null
          production_notes?: string | null
          project_id: string
          qr_code_url?: string | null
          ready_at?: string | null
          rebar_completed_at?: string | null
          status?: string | null
          updated_at?: string | null
          weight_kg?: number | null
          width_mm?: number | null
        }
        Update: {
          batch_number?: string | null
          building_id?: string | null
          cast_at?: string | null
          created_at?: string | null
          created_by?: string | null
          curing_completed_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          drawing_reference?: string | null
          element_type?: string
          floor?: number | null
          height_mm?: number | null
          id?: string
          length_mm?: number | null
          loaded_at?: string | null
          name?: string
          position_description?: string | null
          priority?: number | null
          production_notes?: string | null
          project_id?: string
          qr_code_url?: string | null
          ready_at?: string | null
          rebar_completed_at?: string | null
          status?: string | null
          updated_at?: string | null
          weight_kg?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elements_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fix_in_factory: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          delivery_impact: boolean | null
          element_id: string | null
          id: string
          issue_description: string
          priority: string | null
          project_id: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          delivery_impact?: boolean | null
          element_id?: string | null
          id?: string
          issue_description: string
          priority?: string | null
          project_id?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          delivery_impact?: boolean | null
          element_id?: string | null
          id?: string
          issue_description?: string
          priority?: string | null
          project_id?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fix_in_factory_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fix_in_factory_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fix_in_factory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fix_in_factory_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          anchor1_label: string | null
          anchor1_x_percent: number | null
          anchor1_y_percent: number | null
          anchor2_label: string | null
          anchor2_x_percent: number | null
          anchor2_y_percent: number | null
          building_id: string | null
          created_at: string | null
          floor: number
          height_px: number | null
          id: string
          name: string | null
          plan_image_url: string
          previous_version_id: string | null
          project_id: string
          uploaded_by: string | null
          version: number | null
          width_px: number | null
        }
        Insert: {
          anchor1_label?: string | null
          anchor1_x_percent?: number | null
          anchor1_y_percent?: number | null
          anchor2_label?: string | null
          anchor2_x_percent?: number | null
          anchor2_y_percent?: number | null
          building_id?: string | null
          created_at?: string | null
          floor: number
          height_px?: number | null
          id?: string
          name?: string | null
          plan_image_url: string
          previous_version_id?: string | null
          project_id: string
          uploaded_by?: string | null
          version?: number | null
          width_px?: number | null
        }
        Update: {
          anchor1_label?: string | null
          anchor1_x_percent?: number | null
          anchor1_y_percent?: number | null
          anchor2_label?: string | null
          anchor2_x_percent?: number | null
          anchor2_y_percent?: number | null
          building_id?: string | null
          created_at?: string | null
          floor?: number
          height_px?: number | null
          id?: string
          name?: string | null
          plan_image_url?: string
          previous_version_id?: string | null
          project_id?: string
          uploaded_by?: string | null
          version?: number | null
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plans_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plans_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_id_mapping: {
        Row: {
          id: string
          legacy_id: string
          migrated_at: string | null
          new_id: string
          table_name: string
        }
        Insert: {
          id?: string
          legacy_id: string
          migrated_at?: string | null
          new_id: string
          table_name: string
        }
        Update: {
          id?: string
          legacy_id?: string
          migrated_at?: string | null
          new_id?: string
          table_name?: string
        }
        Relationships: []
      }
      priority_requests: {
        Row: {
          created_at: string | null
          element_id: string
          final_priority: number | null
          id: string
          reason: string | null
          requested_by: string
          requested_priority: number
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          element_id: string
          final_priority?: number | null
          id?: string
          reason?: string | null
          requested_by: string
          requested_priority: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          element_id?: string
          final_priority?: number | null
          id?: string
          reason?: string | null
          requested_by?: string
          requested_priority?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "priority_requests_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          preferences: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          preferences?: Json | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string | null
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
      project_allocations: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          quantity: number
          status: string
          stock_item_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          quantity?: number
          status?: string
          stock_item_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          quantity?: number
          status?: string
          stock_item_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          element_id: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          element_id?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          element_id?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          created_at: string | null
          element_id: string | null
          id: string
          is_read: boolean | null
          message: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          element_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          element_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_end_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_end_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_end_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          location: string | null
          name: string
          quantity_on_hand: number
          reorder_level: number | null
          sku: string
          supplier_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          quantity_on_hand?: number
          reorder_level?: number | null
          sku: string
          supplier_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          sku?: string
          supplier_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_supplier_item_id_fkey"
            columns: ["supplier_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          quantity_change: number
          reference_id: string | null
          stock_item_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          stock_item_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          stock_item_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_items: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          supplier_id: string
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          supplier_id: string
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          supplier_id?: string
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          priority: number | null
          project_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          project_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          project_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_verifications: {
        Row: {
          id: string
          element_id: string
          driver_id: string
          status: string
          rejection_reason: string | null
          notes: string | null
          verified_at: string
          created_at: string
        }
        Insert: {
          id?: string
          element_id: string
          driver_id: string
          status: string
          rejection_reason?: string | null
          notes?: string | null
          verified_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          element_id?: string
          driver_id?: string
          status?: string
          rejection_reason?: string | null
          notes?: string | null
          verified_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_verifications_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_verifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_delivery_for_buyer: { Args: { project_id: string }; Returns: boolean }
      is_element_for_driver: {
        Args: { driver_id: string; element_id: string }
        Returns: boolean
      }
      is_project_for_driver: {
        Args: { driver_id: string; project_id: string }
        Returns: boolean
      }
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
