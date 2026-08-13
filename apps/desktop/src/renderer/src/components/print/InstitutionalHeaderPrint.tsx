import type { DocumentType } from "@isac-erp/shared";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

/**
 * En-tête institutionnelle (République/devise nationale/école/institut/slogan + logos gauche/droite)
 * pour les documents imprimables HTML/CSS (bulletins, reçus...) — réplique en React celle déjà
 * obligatoire sur tous les documents PDF du moteur Module 9 (voir
 * `renderInstitutionalHeader` dans `packages/api/services/documents/pdfEngine.ts`), pour que les
 * deux familles de documents (PDF et HTML imprimable) affichent la même en-tête (retour du porteur
 * du projet, 2026-08-03 : "je ne vois pas l'entête du document comme pour les autres").
 * Entièrement piloté par `institutionalHeaderSettings` — rien n'est codé en dur.
 */
export function InstitutionalHeaderPrint({ documentType }: { documentType: DocumentType }) {
  const headerQuery = trpc.institutionalHeaderSettings.get.useQuery();
  const establishmentQuery = trpc.establishment.get.useQuery();
  const campusQuery = trpc.campus.get.useQuery();
  const templatesQuery = trpc.branding.documentTemplates.list.useQuery();

  const header = headerQuery.data;
  const establishment = establishmentQuery.data;
  const campus = campusQuery.data;
  const template = templatesQuery.data?.find((t) => t.documentType === documentType);
  if (!header || !establishment) return null;

  const logoPrimary = (template?.showLogoPrimary ?? true) ? resolveUploadUrl(establishment.logoPrimaryPath) : null;
  const rightLogos = [
    resolveUploadUrl(establishment.ministryLogoPath),
    template?.showCampusLogo ? resolveUploadUrl(campus?.logoPath ?? null) : null,
    template?.showLogoSecondary ? resolveUploadUrl(establishment.logoSecondaryPath) : null,
  ].filter((src): src is string => Boolean(src));

  return (
    <div className="flex items-start justify-center gap-3">
      <div className="flex w-16 flex-shrink-0 items-start justify-start">
        {logoPrimary && <img src={logoPrimary} alt="" className="h-14 w-14 object-contain" />}
      </div>

      <div className="flex-1 text-center">
        <p className="text-[11px] font-semibold" style={{ color: header.republicColor }}>
          {header.republicLine}
        </p>
        <p className="text-[11px]">
          <span style={{ color: header.mottoPart1Color }}>{header.mottoPart1}</span>
          {" – "}
          <span style={{ color: header.mottoPart2Color }}>{header.mottoPart2}</span>
          {" – "}
          <span style={{ color: header.mottoPart3Color }}>{header.mottoPart3}</span>
        </p>
        <p
          className="mt-1"
          style={{ color: header.schoolNameColor, fontSize: header.schoolNameFontSize, fontWeight: header.schoolNameBold ? 700 : 400 }}
        >
          {header.schoolNameLine}
        </p>
        <p className="text-xs" style={{ color: header.instituteNameColor }}>
          {header.instituteNameLine}
        </p>
        {header.taglineLine && (
          <p className={`text-[11px] ${header.taglineItalic ? "italic" : ""}`} style={{ color: header.taglineColor }}>
            {header.taglineLine}
          </p>
        )}
        {campus?.name && <p className="mt-0.5 text-[10px] print-text-secondary">{campus.name}</p>}
      </div>

      <div className="flex w-16 flex-shrink-0 flex-wrap items-start justify-end gap-1">
        {rightLogos.map((src) => (
          <img key={src} src={src} alt="" className="h-14 w-14 object-contain" />
        ))}
      </div>
    </div>
  );
}
