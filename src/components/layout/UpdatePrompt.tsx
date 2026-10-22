import { useEffect } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

/** Aviso discreto quando há uma versão nova do app: "Nova versão disponível · Atualizar". */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.error("[pwa] falha ao registrar o service worker", err);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast("Nova versão disponível", {
      id: "pwa-update",
      duration: Infinity,
      action: { label: "Atualizar", onClick: () => void updateServiceWorker(true) },
      cancel: { label: "Depois", onClick: () => setNeedRefresh(false) },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
