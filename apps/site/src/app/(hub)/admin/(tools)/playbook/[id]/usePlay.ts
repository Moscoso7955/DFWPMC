"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../playbookClient";
import { noteSaveFailed, noteSaved } from "@/app/components/SaveNote";

export type Collection = "tasks" | "budget" | "items" | "photos" | "dates" | "run";

/** Saves to one play and refreshes the page's data afterwards. */
export function usePlay(playId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = `/admin/api/playbook/plays/${playId}`;

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setError("");
      try {
        const result = await fn();
        noteSaved();
        router.refresh();
        return result;
      } catch (err) {
        noteSaveFailed();
        setError(err instanceof Error ? err.message : "That didn't save. Try again.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return {
    busy,
    error,
    setError,
    run,
    patchPlay: (body: Record<string, unknown>) => run(() => api("PATCH", base, body)),
    add: (collection: Collection, body: Record<string, unknown>) => run(() => api<{ id: string }>("POST", `${base}/${collection}`, body)),
    update: (collection: Collection, id: string, body: Record<string, unknown>) => run(() => api("PATCH", `${base}/${collection}/${id}`, body)),
    remove: (collection: Collection, id: string) => run(() => api("DELETE", `${base}/${collection}/${id}`)),
  };
}

export type PlayApi = ReturnType<typeof usePlay>;
