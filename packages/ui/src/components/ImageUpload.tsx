import { type ChangeEvent, useRef } from "react";
import { Button } from "./Button";
import { cn } from "../lib/cn";

export interface ImageUploadProps {
  label: string;
  currentImageUrl?: string | null;
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  accept?: string;
  className?: string;
}

/**
 * Zone de dépôt/sélection d'image avec aperçu — reste "bête" volontairement :
 * ne connaît rien de l'API ni du redimensionnement (fait côté serveur, voir
 * ADR-012). L'appelant (apps/desktop) gère l'upload réel via `onFileSelected`.
 */
export function ImageUpload({
  label,
  currentImageUrl,
  onFileSelected,
  isUploading = false,
  accept = "image/png,image/jpeg,image/webp",
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-button/30 bg-muted shadow-[0_4px_10px_-4px_hsl(var(--button)/0.35)]">
        {currentImageUrl ? (
          <img src={currentImageUrl} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Aucune</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          className="shadow-[0_3px_8px_-3px_hsl(var(--button)/0.3)]"
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Envoi…" : "Choisir une image"}
        </Button>
      </div>
    </div>
  );
}
