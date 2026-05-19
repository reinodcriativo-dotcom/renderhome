import type { Database } from "./database";

export type Space = Database["public"]["Tables"]["spaces"]["Row"];
export type SpaceTag = Database["public"]["Tables"]["space_tags"]["Row"];
export type SpaceAsset = Database["public"]["Tables"]["space_assets"]["Row"];
export type ProcessingJob =
  Database["public"]["Tables"]["processing_jobs"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SpaceWithRelations extends Space {
  tags: SpaceTag[];
  assets: SpaceAsset[];
  latest_job: ProcessingJob | null;
}
