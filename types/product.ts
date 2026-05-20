import type { Database } from "./database";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductOverlay =
  Database["public"]["Tables"]["product_overlays"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface ProductWithOverlays extends Product {
  overlays: ProductOverlay[];
}
