import { z } from "zod";

export const currencySettingsSchema = z.object({
  currencyCode: z.string().min(1),
  amountFormat: z.string().nullable(),
  thousandsSeparator: z.string(),
  decimalCount: z.number().int().min(0).max(4),
});
export type CurrencySettingsDto = z.infer<typeof currencySettingsSchema>;

export const updateCurrencySettingsInputSchema = currencySettingsSchema.partial();
export type UpdateCurrencySettingsInput = z.infer<typeof updateCurrencySettingsInputSchema>;

export const regionalSettingsSchema = z.object({
  language: z.string(),
  timezone: z.string(),
  dateFormat: z.string(),
  timeFormat: z.string(),
  firstDayOfWeek: z.number().int().min(0).max(6),
});
export type RegionalSettingsDto = z.infer<typeof regionalSettingsSchema>;

export const updateRegionalSettingsInputSchema = regionalSettingsSchema.partial();
export type UpdateRegionalSettingsInput = z.infer<typeof updateRegionalSettingsInputSchema>;
