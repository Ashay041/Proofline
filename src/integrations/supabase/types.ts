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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          specialty: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          pm_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          pm_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          pm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reported_issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_url: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["issue_status"]
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_issues_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          checklist_snapshot: Json | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          photos: string[] | null
          rework_items: Json | null
          rework_note: string | null
          submitted_at: string
          task_id: string
        }
        Insert: {
          checklist_snapshot?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          photos?: string[] | null
          rework_items?: Json | null
          rework_note?: string | null
          submitted_at?: string
          task_id: string
        }
        Update: {
          checklist_snapshot?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          photos?: string[] | null
          rework_items?: Json | null
          rework_note?: string | null
          submitted_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          checklist: Json | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_duration: string | null
          id: string
          name: string
          photos: string[] | null
          pm_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          rework_items: Json | null
          rework_note: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["task_status"]
          unit_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_duration?: string | null
          id?: string
          name: string
          photos?: string[] | null
          pm_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          rework_items?: Json | null
          rework_note?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          unit_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_duration?: string | null
          id?: string
          name?: string
          photos?: string[] | null
          pm_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          rework_items?: Json | null
          rework_note?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          unit_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          property_id: string
          unit_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          unit_number: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "pm" | "vendor"
      issue_status: "reported" | "resolved"
      task_priority: "high" | "medium" | "low"
      task_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "approved"
        | "rework"
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
      app_role: ["pm", "vendor"],
      issue_status: ["reported", "resolved"],
      task_priority: ["high", "medium", "low"],
      task_status: [
        "not_started",
        "in_progress",
        "completed",
        "approved",
        "rework",
      ],
    },
  },
} as const
