export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      contractors: {
        Row: {
          id: string;
          landlord_id: string;
          name: string;
          trade: string;
          phone: string | null;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          name: string;
          trade: string;
          phone?: string | null;
          email: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contractors"]["Insert"]>;
      };
      landlords: {
        Row: { id: string; user_id: string; name: string | null; email: string | null; created_at: string };
        Insert: { id?: string; user_id: string; name?: string | null; email?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["landlords"]["Insert"]>;
      };
      maintenance_tickets: {
        Row: {
          id: string;
          landlord_id: string | null;
          contractor_id: string | null;
          tenant_name: string;
          tenant_phone: string;
          tenant_email: string;
          property_address: string;
          unit_number: string | null;
          request_type: string;
          description: string;
          availability_windows: string;
          status: string;
          public_token: string;
          ai_title: string | null;
          ai_category: string | null;
          ai_urgency: string | null;
          ai_summary: string | null;
          ai_missing_info: string[] | null;
          ai_tenant_follow_up: string | null;
          ai_contractor_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          landlord_id?: string | null;
          contractor_id?: string | null;
          tenant_name: string;
          tenant_phone: string;
          tenant_email: string;
          property_address: string;
          unit_number?: string | null;
          request_type: string;
          description: string;
          availability_windows: string;
          status?: string;
          public_token: string;
          ai_title?: string | null;
          ai_category?: string | null;
          ai_urgency?: string | null;
          ai_summary?: string | null;
          ai_missing_info?: string[] | null;
          ai_tenant_follow_up?: string | null;
          ai_contractor_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_tickets"]["Insert"]>;
      };
      ticket_events: {
        Row: { id: string; ticket_id: string; actor_type: string; body: string; created_at: string };
        Insert: { id?: string; ticket_id: string; actor_type: string; body: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["ticket_events"]["Insert"]>;
      };
      ticket_files: {
        Row: { id: string; ticket_id: string; file_name: string; file_path: string; content_type: string | null; created_at: string };
        Insert: { id?: string; ticket_id: string; file_name: string; file_path: string; content_type?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["ticket_files"]["Insert"]>;
      };
      ticket_messages: {
        Row: { id: string; ticket_id: string; sender_type: string; body: string; created_at: string };
        Insert: { id?: string; ticket_id: string; sender_type: string; body: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["ticket_messages"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
