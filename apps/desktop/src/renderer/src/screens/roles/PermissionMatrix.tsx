import type { PermissionDto, RoleDto } from "@isac-erp/shared";
import { Badge, Button, Checkbox } from "@isac-erp/ui";
import { useMemo, useState } from "react";

export interface PermissionMatrixProps {
  role: RoleDto;
  permissions: PermissionDto[];
  onSave: (permissionIds: string[]) => void;
  isSaving: boolean;
}

/**
 * Tableau rôle × module × action (voir MODULE-01 §4.3). Le Super
 * Administrateur n'apparaît pas ici : il a implicitement tout (§3.3).
 */
export function PermissionMatrix({ role, permissions, onSave, isSaving }: PermissionMatrixProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissionIds));

  const byModule = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const permission of permissions) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }
    return map;
  }, [permissions]);

  function toggle(permissionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{role.label}</h3>
        {role.isSystem && <Badge variant="muted">Rôle système</Badge>}
      </div>

      <div className="flex flex-col gap-4">
        {[...byModule.entries()].map(([module, modulePermissions]) => (
          <div key={module} className="rounded-md border border-border p-3">
            <p className="mb-2 text-sm font-medium">{module}</p>
            <div className="flex flex-wrap gap-4">
              {modulePermissions.map((permission) => (
                <label key={permission.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.has(permission.id)}
                    onChange={() => toggle(permission.id)}
                  />
                  {permission.action}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button className="self-end" disabled={isSaving} onClick={() => onSave([...selected])}>
        {isSaving ? "Enregistrement…" : "Enregistrer les permissions"}
      </Button>
    </div>
  );
}
