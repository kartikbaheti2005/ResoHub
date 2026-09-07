export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          date: string;
          description: string;
          end_time: string;
          expected_count: number;
          id: string;
          purpose: string;
          rejection_reason: string | null;
          requested_at: string;
          required_equipment: string[];
          resource_id: string;
          resource_location: string;
          resource_name: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          start_time: string;
          status: Database["public"]["Enums"]["booking_status"];
          user_department: string;
          user_email: string;
          user_id: string;
          user_name: string;
          user_role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          date: string;
          description?: string;
          end_time: string;
          expected_count?: number;
          id?: string;
          purpose: string;
          rejection_reason?: string | null;
          requested_at?: string;
          required_equipment?: string[];
          resource_id: string;
          resource_location?: string;
          resource_name?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          start_time: string;
          status?: Database["public"]["Enums"]["booking_status"];
          user_department?: string;
          user_email?: string;
          user_id: string;
          user_name?: string;
          user_role?: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          date?: string;
          description?: string;
          end_time?: string;
          expected_count?: number;
          id?: string;
          purpose?: string;
          rejection_reason?: string | null;
          requested_at?: string;
          required_equipment?: string[];
          resource_id?: string;
          resource_location?: string;
          resource_name?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          start_time?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          user_department?: string;
          user_email?: string;
          user_id?: string;
          user_name?: string;
          user_role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [
          {
            foreignKeyName: "bookings_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          description: string;
          icon: string;
          id: string;
          name: string;
        };
        Insert: {
          description?: string;
          icon?: string;
          id: string;
          name: string;
        };
        Update: {
          description?: string;
          icon?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      maintenance_schedules: {
        Row: {
          created_at: string;
          end_date: string;
          end_time: string;
          id: string;
          reason: string;
          resource_id: string;
          resource_name: string;
          start_date: string;
          start_time: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          end_time?: string;
          id?: string;
          reason?: string;
          resource_id: string;
          resource_name?: string;
          start_date: string;
          start_time?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          end_time?: string;
          id?: string;
          reason?: string;
          resource_id?: string;
          resource_name?: string;
          start_date?: string;
          start_time?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          message: string;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message?: string;
          title: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message?: string;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          department: string;
          email: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          department?: string;
          email?: string;
          id: string;
          name?: string;
        };
        Update: {
          created_at?: string;
          department?: string;
          email?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          capacity: number;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          location: string;
          name: string;
          resource_type: string;
          specifications: Json;
          status: Database["public"]["Enums"]["resource_status"];
          updated_at: string;
        };
        Insert: {
          capacity?: number;
          created_at?: string;
          description?: string;
          id: string;
          image_url?: string | null;
          location?: string;
          name: string;
          resource_type?: string;
          specifications?: Json;
          status?: Database["public"]["Enums"]["resource_status"];
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          location?: string;
          name?: string;
          resource_type?: string;
          specifications?: Json;
          status?: Database["public"]["Enums"]["resource_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      timetable_entries: {
        Row: {
          academic_year: string;
          class_section: string;
          day_of_week: string;
          end_time: string;
          faculty: string;
          id: string;
          resource_id: string;
          resource_name: string;
          start_time: string;
          subject: string;
        };
        Insert: {
          academic_year?: string;
          class_section?: string;
          day_of_week: string;
          end_time: string;
          faculty?: string;
          id?: string;
          resource_id: string;
          resource_name?: string;
          start_time: string;
          subject?: string;
        };
        Update: {
          academic_year?: string;
          class_section?: string;
          day_of_week?: string;
          end_time?: string;
          faculty?: string;
          id?: string;
          resource_id?: string;
          resource_name?: string;
          start_time?: string;
          subject?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timetable_entries_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "MANAGER" | "TEACHER" | "STUDENT" | "CR";
      booking_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
      notification_type: "APPROVAL" | "REJECTION" | "REQUEST_CREATED" | "MAINTENANCE" | "SYSTEM";
      resource_status: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["MANAGER", "TEACHER", "STUDENT", "CR"],
      booking_status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"],
      notification_type: ["APPROVAL", "REJECTION", "REQUEST_CREATED", "MAINTENANCE", "SYSTEM"],
      resource_status: ["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"],
    },
  },
} as const;
