import { z } from "zod";

export const wasteRecordSchema = z.object({
  day: z.number().int().min(1, "Día mínimo 1").max(31, "Día máximo 31"),
  month: z.number().int().min(1, "Mes mínimo 1").max(12, "Mes máximo 12"),
  year: z.number().int().min(2020, "Año mínimo 2020").max(2100, "Año máximo 2100"),
  aprovechablesOrganicos: z.number().nonnegative("No puede ser negativo").max(10000, "Máximo 10000 kg"),
  aprovechables: z.number().nonnegative("No puede ser negativo").max(10000, "Máximo 10000 kg"),
  noAprovechables: z.number().nonnegative("No puede ser negativo").max(10000, "Máximo 10000 kg"),
  biosanitarios: z.number().nonnegative("No puede ser negativo").max(5000, "Máximo 5000 kg"),
  anatomopatologicos: z.number().nonnegative("No puede ser negativo").max(1000, "Máximo 1000 kg"),
  cortopunzantes: z.number().nonnegative("No puede ser negativo").max(2000, "Máximo 2000 kg"),
  deAnimales: z.number().nonnegative("No puede ser negativo").max(1000, "Máximo 1000 kg"),
  farmacos: z.number().nonnegative("No puede ser negativo").max(500, "Máximo 500 kg"),
});

export const partialWasteRecordSchema = wasteRecordSchema.partial();

export type WasteRecordInput = z.infer<typeof wasteRecordSchema>;
export type PartialWasteRecord = z.infer<typeof partialWasteRecordSchema>;