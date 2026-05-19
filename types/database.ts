export type SpaceStatus =
  | "draft"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type AssetType = "image" | "video" | "model" | "thumbnail" | "metadata";

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
      spaces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          address: string | null;
          status: SpaceStatus;
          public_slug: string | null;
          is_public: boolean;
          thumbnail_url: string | null;
          viewer_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          status?: SpaceStatus;
          public_slug?: string | null;
          is_public?: boolean;
          thumbnail_url?: string | null;
          viewer_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["spaces"]["Insert"]>;
        Relationships: [];
      };
      space_tags: {
        Row: {
          id: string;
          space_id: string;
          tag: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          tag: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["space_tags"]["Insert"]>;
        Relationships: [];
      };
      space_assets: {
        Row: {
          id: string;
          space_id: string;
          user_id: string;
          type: AssetType;
          file_url: string;
          file_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          user_id: string;
          type: AssetType;
          file_url: string;
          file_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["space_assets"]["Insert"]>;
        Relationships: [];
      };
      processing_jobs: {
        Row: {
          id: string;
          space_id: string;
          user_id: string;
          status: JobStatus;
          progress: number;
          error_message: string | null;
          input_assets: Json | null;
          output_assets: Json | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          space_id: string;
          user_id: string;
          status?: JobStatus;
          progress?: number;
          error_message?: string | null;
          input_assets?: Json | null;
          output_assets?: Json | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["processing_jobs"]["Insert"]
        >;
        Relationships: [];
      };
    };
  };
}
