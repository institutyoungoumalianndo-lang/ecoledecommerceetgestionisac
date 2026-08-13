import { z } from "zod";

export const establishmentSettingsSchema = z.object({
  officialName: z.string().min(1),
  acronym: z.string().nullable(),
  motto: z.string().nullable(),
  slogan: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  prefecture: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  phones: z.array(z.string()),
  primaryEmail: z.string().email().nullable(),
  secondaryEmail: z.string().email().nullable(),
  website: z.string().nullable(),
  logoPrimaryPath: z.string().nullable(),
  logoSecondaryPath: z.string().nullable(),
  ministryLogoPath: z.string().nullable(),
  faviconPath: z.string().nullable(),
  authorizationNumber: z.string().nullable(),
  taxNumber: z.string().nullable(),
  rccmNumber: z.string().nullable(),
  administrativeReferences: z.string().nullable(),
  legalMentions: z.string().nullable(),
});
export type EstablishmentSettingsDto = z.infer<typeof establishmentSettingsSchema>;

export const updateEstablishmentSettingsInputSchema = establishmentSettingsSchema
  .omit({ officialName: true })
  .partial()
  .extend({ officialName: z.string().min(1).optional() });
export type UpdateEstablishmentSettingsInput = z.infer<
  typeof updateEstablishmentSettingsInputSchema
>;

export const campusSettingsSchema = z.object({
  name: z.string().min(1),
  code: z.string().nullable(),
  address: z.string().nullable(),
  phones: z.array(z.string()),
  email: z.string().email().nullable(),
  gpsLatitude: z.number().nullable(),
  gpsLongitude: z.number().nullable(),
  managerUserId: z.string().uuid().nullable(),
  /** Logo du campus (Module 9 §1.3) — distinct des logos établissement/ministère. */
  logoPath: z.string().nullable(),
});
export type CampusSettingsDto = z.infer<typeof campusSettingsSchema>;

export const updateCampusSettingsInputSchema = campusSettingsSchema.partial();
export type UpdateCampusSettingsInput = z.infer<typeof updateCampusSettingsInputSchema>;
