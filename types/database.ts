export type ProductStatus = "draft" | "ready" | "archived";

export type ProductCategory =
  | "tenis"
  | "camiseta"
  | "bone"
  | "relogio"
  | "custom";

export type OverlayType = "text" | "price" | "badge";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          price_cents: number | null;
          currency: string;
          category: ProductCategory;
          size_label: string | null;
          dim_length_cm: number | null;
          dim_width_cm: number | null;
          dim_height_cm: number | null;
          marker_width_cm: number;
          model_url: string | null;
          model_path: string | null;
          model_size_bytes: number | null;
          marker_url: string | null;
          marker_path: string | null;
          mind_file_url: string | null;
          mind_file_path: string | null;
          public_slug: string | null;
          is_public: boolean;
          status: ProductStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          price_cents?: number | null;
          currency?: string;
          category?: ProductCategory;
          size_label?: string | null;
          dim_length_cm?: number | null;
          dim_width_cm?: number | null;
          dim_height_cm?: number | null;
          marker_width_cm?: number;
          model_url?: string | null;
          model_path?: string | null;
          model_size_bytes?: number | null;
          marker_url?: string | null;
          marker_path?: string | null;
          mind_file_url?: string | null;
          mind_file_path?: string | null;
          public_slug?: string | null;
          is_public?: boolean;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_overlays: {
        Row: {
          id: string;
          product_id: string;
          type: OverlayType;
          content: string;
          position_x: number;
          position_y: number;
          position_z: number;
          rotation_y: number;
          scale: number;
          color: string;
          background_color: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          type: OverlayType;
          content: string;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          rotation_y?: number;
          scale?: number;
          color?: string;
          background_color?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_overlays"]["Insert"]
        >;
        Relationships: [];
      };
    };
  };
}
