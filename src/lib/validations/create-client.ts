import { z } from "zod";

export const createClientSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres")
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, "Debe tener letra y número"),
  fullName: z.string().min(2, "Nombre requerido").max(100, "Máximo 100 caracteres"),
  institutionName: z
    .string()
    .min(2, "Nombre de institución requerido")
    .max(200, "Máximo 200 caracteres"),
  address: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),
  responsiblePerson: z.string().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;