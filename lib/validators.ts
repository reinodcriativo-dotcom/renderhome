import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Informe seu nome").max(80),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Informe o nome do produto").max(120),
  description: z.string().max(2000).optional().nullable(),
  price_cents: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  currency: z.string().length(3).optional(),
  category: z
    .enum(["tenis", "camiseta", "bone", "relogio", "custom"])
    .optional(),
  size_label: z.string().max(40).optional().nullable(),
  dim_length_cm: z.number().positive().max(500).optional().nullable(),
  dim_width_cm: z.number().positive().max(500).optional().nullable(),
  dim_height_cm: z.number().positive().max(500).optional().nullable(),
  marker_width_cm: z.number().positive().max(200).optional(),
  is_public: z.boolean().optional(),
  status: z.enum(["draft", "ready", "archived"]).optional(),
});

export const overlaySchema = z.object({
  type: z.enum(["text", "price", "badge"]),
  content: z.string().min(1).max(200),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  position_z: z.number().optional(),
  rotation_y: z.number().optional(),
  scale: z.number().positive().optional(),
  color: z.string().optional(),
  background_color: z.string().optional(),
  order_index: z.number().int().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OverlayInput = z.infer<typeof overlaySchema>;

export const ALLOWED_MODEL_EXTENSIONS = [".glb", ".gltf"];

export function isAllowedModelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_MODEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}
