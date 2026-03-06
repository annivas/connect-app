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
      collection_collaborators: {
        Row: {
          collection_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_collaborators_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          disappearing_duration: string | null
          is_archived: boolean
          is_marked_unread: boolean
          is_muted: boolean
          is_pinned: boolean
          joined_at: string
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          disappearing_duration?: string | null
          is_archived?: boolean
          is_marked_unread?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          disappearing_duration?: string | null
          is_archived?: boolean
          is_marked_unread?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          event_id: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          group_id: string
          id: string
          location: Json | null
          start_date: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          group_id: string
          id?: string
          location?: Json | null
          start_date: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          group_id?: string
          id?: string
          location?: Json | null
          start_date?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          disappearing_duration: string | null
          group_id: string
          is_admin: boolean
          is_archived: boolean
          is_marked_unread: boolean
          is_muted: boolean
          is_pinned: boolean
          joined_at: string
          unread_count: number
          user_id: string
        }
        Insert: {
          disappearing_duration?: string | null
          group_id: string
          is_admin?: boolean
          is_archived?: boolean
          is_marked_unread?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          disappearing_duration?: string | null
          group_id?: string
          is_admin?: boolean
          is_archived?: boolean
          is_marked_unread?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_activity: string
          name: string
          type: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_activity?: string
          name: string
          type?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_activity?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          cost: number | null
          day: number
          description: string | null
          id: string
          location: Json | null
          sort_order: number
          time: string | null
          title: string
          trip_id: string
          type: string
        }
        Insert: {
          cost?: number | null
          day: number
          description?: string | null
          id?: string
          location?: Json | null
          sort_order?: number
          time?: string | null
          title: string
          trip_id: string
          type?: string
        }
        Update: {
          cost?: number | null
          day?: number
          description?: string | null
          id?: string
          location?: Json | null
          sort_order?: number
          time?: string | null
          title?: string
          trip_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          category: string | null
          conversation_id: string | null
          date: string
          description: string
          group_id: string | null
          id: string
          is_settled: boolean
          paid_by: string
          split_between: string[]
        }
        Insert: {
          amount: number
          category?: string | null
          conversation_id?: string | null
          date?: string
          description: string
          group_id?: string | null
          id?: string
          is_settled?: boolean
          paid_by: string
          split_between: string[]
        }
        Update: {
          amount?: number
          category?: string | null
          conversation_id?: string | null
          date?: string
          description?: string
          group_id?: string | null
          id?: string
          is_settled?: boolean
          paid_by?: string
          split_between?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          context_id: string
          context_type: string
          created_at: string
          id: string
          is_private: boolean
          is_read: boolean
          metadata: Json | null
          reactions: Json | null
          sender_id: string
          type: string
        }
        Insert: {
          content?: string
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          is_private?: boolean
          is_read?: boolean
          metadata?: Json | null
          reactions?: Json | null
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          is_private?: boolean
          is_read?: boolean
          metadata?: Json | null
          reactions?: Json | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          color: string
          content: string
          conversation_id: string | null
          created_at: string
          created_by: string
          group_id: string | null
          id: string
          is_private: boolean
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          content?: string
          conversation_id?: string | null
          created_at?: string
          created_by: string
          group_id?: string | null
          id?: string
          is_private?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          content?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          group_id?: string | null
          id?: string
          is_private?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          status_message: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string
          phone?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string | null
          username?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          group_id: string
          id: string
          is_closed: boolean
          is_multiple_choice: boolean
          options: Json
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          is_closed?: boolean
          is_multiple_choice?: boolean
          options?: Json
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          is_closed?: boolean
          is_multiple_choice?: boolean
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          assigned_to: string[] | null
          conversation_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          group_id: string | null
          id: string
          is_completed: boolean
          priority: string
          title: string
        }
        Insert: {
          assigned_to?: string[] | null
          conversation_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          group_id?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          title: string
        }
        Update: {
          assigned_to?: string[] | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          group_id?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_objects: {
        Row: {
          collection_id: string | null
          conversation_id: string | null
          description: string | null
          group_id: string | null
          id: string
          metadata: Json
          shared_at: string
          shared_by: string
          thumbnail: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          collection_id?: string | null
          conversation_id?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          shared_at?: string
          shared_by: string
          thumbnail?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          collection_id?: string | null
          conversation_id?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          shared_at?: string
          shared_by?: string
          thumbnail?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_objects_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_objects_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_objects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_objects_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget: number | null
          created_at: string
          destination: string
          end_date: string
          group_id: string
          id: string
          participants: string[]
          start_date: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          destination: string
          end_date: string
          group_id: string
          id?: string
          participants?: string[]
          start_date: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          destination?: string
          end_date?: string
          group_id?: string
          id?: string
          participants?: string[]
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
