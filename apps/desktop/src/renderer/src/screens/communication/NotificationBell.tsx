import type { InternalNotificationDto } from "@isac-erp/shared";
import { Badge, Button, Dialog } from "@isac-erp/ui";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Notifications internes — cloche in-app (voir MODULE-12 §1.10/§1.14, canal INTERNE), enrichie
 * refonte UI/UX phase finale (2026-07-30) : "Tout marquer comme lu" et un centre de notifications
 * complet (Dialog "Voir tout"). `onNavigate` route un clic vers l'écran concerné à partir du
 * `linkType` de la notification (ex. "payment" → section Paiements) — absent = pas de navigation.
 */
export function NotificationBell({ onNavigate }: { onNavigate?: (linkType: string) => void } = {}) {
  const [open, setOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const utils = trpc.useUtils();
  const query = trpc.internalNotifications.list.useQuery({});
  const unreadCount = (query.data ?? []).filter((n) => !n.isRead).length;

  const markRead = trpc.internalNotifications.markRead.useMutation({
    onSuccess: () => void utils.internalNotifications.list.invalidate(),
  });
  const markAllRead = trpc.internalNotifications.markAllRead.useMutation({
    onSuccess: () => void utils.internalNotifications.list.invalidate(),
  });

  function handleSelect(n: InternalNotificationDto) {
    if (!n.isRead) markRead.mutate({ id: n.id });
    if (n.linkType) {
      onNavigate?.(n.linkType);
      setOpen(false);
      setCenterOpen(false);
    }
  }

  const recent = (query.data ?? []).slice(0, 5);

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen((v) => !v)} className="relative">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 flex max-h-96 w-80 flex-col gap-2 overflow-auto rounded-lg border border-border bg-background p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck size={12} />
                Tout marquer comme lu
              </button>
            )}
          </div>
          {recent.length === 0 && <p className="text-sm text-muted-foreground">Aucune notification.</p>}
          {recent.map((n) => (
            <NotificationRow key={n.id} notification={n} onSelect={() => handleSelect(n)} />
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setCenterOpen(true);
              setOpen(false);
            }}
          >
            Voir toutes les notifications
          </Button>
        </div>
      )}

      <Dialog
        open={centerOpen}
        onClose={() => setCenterOpen(false)}
        title="Centre de notifications"
        icon={<Bell size={18} />}
      >
        <div className="flex flex-col gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" icon={<CheckCheck size={16} />} className="self-end" onClick={() => markAllRead.mutate()}>
              Tout marquer comme lu
            </Button>
          )}
          {(query.data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune notification.</p>
          )}
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {(query.data ?? []).map((n) => (
              <NotificationRow key={n.id} notification={n} onSelect={() => handleSelect(n)} />
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function NotificationRow({ notification: n, onSelect }: { notification: InternalNotificationDto; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-0.5 rounded-lg border border-border p-2 text-left text-sm transition-colors hover:bg-muted ${
        n.isRead ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{n.title}</span>
        {!n.isRead && <Badge variant="default">Nouveau</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{n.content}</p>
      <p className="text-xs text-muted-foreground">{n.createdAt.toLocaleString("fr-FR")}</p>
    </button>
  );
}
