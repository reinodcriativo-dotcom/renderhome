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

export const spaceSchema = z.object({
  name: z.string().min(1, "Informe um nome").max(120),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SpaceInput = z.infer<typeof spaceSchema>;

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
export const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function isAllowedCaptureFile(file: File): boolean {
  return (
    ALLOWED_IMAGE_MIME.includes(file.type) ||
    ALLOWED_VIDEO_MIME.includes(file.type) ||
    file.type.startsWith("image/") ||
    file.type.startsWith("video/")
  );
}
