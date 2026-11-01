"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { randomUUID } from "@/lib/uuid";
import { emptyWorkspaceState } from "@/lib/workspace/constants.js";
import {
  loadWorkspaceState,
  normalizeWorkspaceUrl,
  saveWorkspaceState,
} from "@/lib/workspace/storage.js";

const WorkspaceContext = createContext(null);

function persist(state) {
  saveWorkspaceState(state);
  return state;
}

export function WorkspaceProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(emptyWorkspaceState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load persisted workspace from localStorage after mount
    setState(loadWorkspaceState());
    setHydrated(true);
  }, []);

  const update = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return persist(next);
    });
  }, []);

  const openApp = useCallback(
    (appId) => {
      update((prev) => {
        const app = prev.apps.find((item) => item.id === appId);
        if (!app) {
          return prev;
        }
        const openTabIds = prev.openTabIds.includes(appId)
          ? prev.openTabIds
          : [...prev.openTabIds, appId];
        return {
          ...prev,
          openTabIds,
          activeTabId: appId,
        };
      });
      if (pathname !== "/workspace") {
        router.push("/workspace");
      }
    },
    [pathname, router, update],
  );

  const setActiveTab = useCallback(
    (appId) => {
      update((prev) => {
        if (!prev.openTabIds.includes(appId)) {
          return prev;
        }
        return { ...prev, activeTabId: appId };
      });
      if (pathname !== "/workspace") {
        router.push("/workspace");
      }
    },
    [pathname, router, update],
  );

  const repairActiveTab = useCallback(() => {
    update((prev) => {
      if (!prev.openTabIds.length) {
        return prev.activeTabId === null ? prev : { ...prev, activeTabId: null };
      }
      if (prev.activeTabId && prev.openTabIds.includes(prev.activeTabId)) {
        return prev;
      }
      return { ...prev, activeTabId: prev.openTabIds[prev.openTabIds.length - 1] };
    });
  }, [update]);

  const closeTab = useCallback(
    (appId) => {
      update((prev) => {
        const openTabIds = prev.openTabIds.filter((id) => id !== appId);
        let activeTabId = prev.activeTabId;
        if (activeTabId === appId) {
          activeTabId = openTabIds[openTabIds.length - 1] ?? null;
        }
        return { ...prev, openTabIds, activeTabId };
      });
    },
    [update],
  );

  const addApp = useCallback(
    ({ name, url }) => {
      const href = normalizeWorkspaceUrl(url);
      if (!href) {
        return { ok: false, error: "Enter a valid http or https URL" };
      }
      const id = randomUUID();
      const label = (name || "").trim() || new URL(href).hostname;
      update((prev) => ({
        ...prev,
        apps: [...prev.apps, { id, name: label.slice(0, 120), url: href }],
      }));
      return { ok: true, id };
    },
    [update],
  );

  const updateApp = useCallback(
    (appId, { name, url }) => {
      const href = url !== undefined ? normalizeWorkspaceUrl(url) : undefined;
      if (url !== undefined && !href) {
        return { ok: false, error: "Enter a valid http or https URL" };
      }
      update((prev) => ({
        ...prev,
        apps: prev.apps.map((app) => {
          if (app.id !== appId) {
            return app;
          }
          return {
            ...app,
            name:
              name !== undefined
                ? String(name).trim().slice(0, 120) || app.name
                : app.name,
            url: href ?? app.url,
          };
        }),
      }));
      return { ok: true };
    },
    [update],
  );

  const removeApp = useCallback(
    (appId) => {
      update((prev) => ({
        apps: prev.apps.filter((app) => app.id !== appId),
        openTabIds: prev.openTabIds.filter((id) => id !== appId),
        activeTabId: prev.activeTabId === appId ? null : prev.activeTabId,
      }));
    },
    [update],
  );

  const moveApp = useCallback(
    (appId, direction) => {
      update((prev) => {
        const index = prev.apps.findIndex((app) => app.id === appId);
        if (index < 0) {
          return prev;
        }
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= prev.apps.length) {
          return prev;
        }
        const apps = [...prev.apps];
        const [item] = apps.splice(index, 1);
        apps.splice(target, 0, item);
        return { ...prev, apps };
      });
    },
    [update],
  );

  const value = useMemo(
    () => ({
      hydrated,
      apps: state.apps,
      openTabIds: state.openTabIds,
      activeTabId: state.activeTabId,
      openApp,
      setActiveTab,
      closeTab,
      addApp,
      updateApp,
      removeApp,
      moveApp,
      repairActiveTab,
    }),
    [
      hydrated,
      state,
      openApp,
      setActiveTab,
      closeTab,
      addApp,
      updateApp,
      removeApp,
      moveApp,
      repairActiveTab,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
