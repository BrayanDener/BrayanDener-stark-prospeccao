// Tipos gerados do banco do Supabase (projeto stark-prospeccao).
// Para regenerar: Supabase MCP generate_typescript_types ou `supabase gen types typescript`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type LeadViewRow = {
  address: string | null;
  business_status: string | null;
  city: string | null;
  closed_at: string | null;
  first_seen_at: string | null;
  follow_up_at: string | null;
  google_maps_uri: string | null;
  id: string | null;
  last_contact_at: string | null;
  last_fetched_at: string | null;
  last_service: string | null;
  lat: number | null;
  lng: number | null;
  name: string | null;
  niche: string | null;
  notes: string | null;
  opening_hours: Json | null;
  phone_e164: string | null;
  phone_national: string | null;
  phone_type: string | null;
  place_id: string | null;
  primary_type: string | null;
  rating: number | null;
  replied_at: string | null;
  reviews_count: number | null;
  status: string | null;
  status_updated_at: string | null;
  types: string[] | null;
  user_id: string | null;
  website: string | null;
  website_kind: string | null;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      geocode_cache: {
        Row: { city_normalized: string; created_at: string; formatted_address: string | null; id: string; lat: number; lng: number; user_id: string };
        Insert: { city_normalized: string; created_at?: string; formatted_address?: string | null; id?: string; lat: number; lng: number; user_id?: string };
        Update: { city_normalized?: string; created_at?: string; formatted_address?: string | null; id?: string; lat?: number; lng?: number; user_id?: string };
        Relationships: [];
      };
      lead_activities: {
        Row: { created_at: string; description: string; id: string; lead_id: string; type: string; user_id: string };
        Insert: { created_at?: string; description?: string; id?: string; lead_id: string; type: string; user_id?: string };
        Update: { created_at?: string; description?: string; id?: string; lead_id?: string; type?: string; user_id?: string };
        Relationships: [];
      };
      lead_status: {
        Row: {
          closed_at: string | null;
          follow_up_at: string | null;
          last_contact_at: string | null;
          lead_id: string;
          notes: string;
          replied_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          closed_at?: string | null;
          follow_up_at?: string | null;
          last_contact_at?: string | null;
          lead_id: string;
          notes?: string;
          replied_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          closed_at?: string | null;
          follow_up_at?: string | null;
          last_contact_at?: string | null;
          lead_id?: string;
          notes?: string;
          replied_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          address: string | null;
          business_status: string | null;
          city: string;
          first_seen_at: string;
          google_maps_uri: string | null;
          id: string;
          last_fetched_at: string;
          lat: number | null;
          lng: number | null;
          name: string;
          niche: string;
          opening_hours: Json | null;
          phone_e164: string | null;
          phone_national: string | null;
          phone_type: string;
          place_id: string;
          primary_type: string | null;
          rating: number | null;
          reviews_count: number;
          types: string[];
          user_id: string;
          website: string | null;
          website_kind: string;
        };
        Insert: {
          address?: string | null;
          business_status?: string | null;
          city: string;
          first_seen_at?: string;
          google_maps_uri?: string | null;
          id?: string;
          last_fetched_at?: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          niche: string;
          opening_hours?: Json | null;
          phone_e164?: string | null;
          phone_national?: string | null;
          phone_type?: string;
          place_id: string;
          primary_type?: string | null;
          rating?: number | null;
          reviews_count?: number;
          types?: string[];
          user_id?: string;
          website?: string | null;
          website_kind?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      message_templates: {
        Row: { body: string; id: string; is_default: boolean; niche: string | null; service: string; title: string; updated_at: string; user_id: string };
        Insert: { body: string; id?: string; is_default?: boolean; niche?: string | null; service: string; title: string; updated_at?: string; user_id?: string };
        Update: { body?: string; id?: string; is_default?: boolean; niche?: string | null; service?: string; title?: string; updated_at?: string; user_id?: string };
        Relationships: [];
      };
      search_leads: {
        Row: { lead_id: string; search_id: string; user_id: string };
        Insert: { lead_id: string; search_id: string; user_id?: string };
        Update: { lead_id?: string; search_id?: string; user_id?: string };
        Relationships: [];
      };
      searches: {
        Row: {
          city: string;
          city_normalized: string;
          created_at: string;
          from_cache: boolean;
          google_requests: number;
          id: string;
          lat: number | null;
          lng: number | null;
          niche: string;
          radius_m: number | null;
          service: string;
          show_all: boolean;
          source_search_id: string | null;
          total_found: number;
          total_qualified: number;
          user_id: string;
        };
        Insert: {
          city: string;
          city_normalized: string;
          created_at?: string;
          from_cache?: boolean;
          google_requests?: number;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          niche: string;
          radius_m?: number | null;
          service: string;
          show_all?: boolean;
          source_search_id?: string | null;
          total_found?: number;
          total_qualified?: number;
          user_id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["searches"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          cache_days: number;
          followup_days: number;
          hide_contacted: boolean;
          min_reviews_busy: number;
          signature: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cache_days?: number;
          followup_days?: number;
          hide_contacted?: boolean;
          min_reviews_busy?: number;
          signature?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          cache_days?: number;
          followup_days?: number;
          hide_contacted?: boolean;
          min_reviews_busy?: number;
          signature?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_leads: {
        Row: LeadViewRow;
        Relationships: [];
      };
    };
    Functions: {
      clone_cached_search: {
        Args: { p_city: string; p_service: string; p_show_all: boolean; p_source_id: string; p_total_qualified: number };
        Returns: string;
      };
      complete_follow_up: { Args: { p_lead_id: string }; Returns: Json };
      dashboard_summary: { Args: never; Returns: Json };
      due_followups: { Args: { p_limit?: number }; Returns: LeadViewRow[] };
      ensure_user_setup: { Args: { p_templates?: Json }; Returns: undefined };
      followup_days: { Args: never; Returns: number };
      get_search_leads: { Args: { p_search_id: string }; Returns: LeadViewRow[] };
      register_contact: { Args: { p_channel: string; p_lead_id: string; p_message?: string }; Returns: Json };
      restore_lead_state: { Args: { p_lead_id: string; p_previous: Json }; Returns: undefined };
      save_search_results: { Args: { p_leads: Json; p_search: Json }; Returns: string };
      set_follow_up: { Args: { p_at: string | null; p_lead_id: string }; Returns: Json };
      set_lead_status: { Args: { p_lead_id: string; p_status: string }; Returns: Json };
      status_label: { Args: { p_status: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type ViewRow<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
