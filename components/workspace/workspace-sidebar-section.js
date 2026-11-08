"use client";

import { useEffect, useState } from "react";
import { WORKSPACE_SECTION_EXPANDED_KEY } from "@/lib/workspace/constants.js";
import { useWorkspace } from "@/contexts/workspace-context";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import { useConfirm } from "@/contexts/confirm-context";

function readSectionExpanded() {
  return window.localStorage.getItem(WORKSPACE_SECTION_EXPANDED_KEY) !== "0";
}

export default function WorkspaceSidebarSection({ collapsed = false, nested = false }) {
  const confirm = useConfirm();
  const { apps, openApp, addApp, updateApp, removeApp, moveApp, hydrated } =
    useWorkspace();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read sidebar collapse preference after mount
    setExpanded(readSectionExpanded());
  }, []);

  const ensureSectionExpanded = () => {
    setExpanded(true);
    window.localStorage.setItem(WORKSPACE_SECTION_EXPANDED_KEY, "1");
  };
  const [manageOpen, setManageOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const toggleSection = () => {
    setExpanded((value) => {
      const next = !value;
      window.localStorage.setItem(WORKSPACE_SECTION_EXPANDED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const resetDraft = () => {
    setEditingId(null);
    setDraftName("");
    setDraftUrl("");
    setFormError("");
  };

  const startEdit = (app) => {
    setEditingId(app.id);
    setDraftName(app.name);
    setDraftUrl(app.url);
    setFormError("");
  };

  const saveDraft = () => {
    if (editingId) {
      const result = updateApp(editingId, { name: draftName, url: draftUrl });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
    } else {
      const result = addApp({ name: draftName, url: draftUrl });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      ensureSectionExpanded();
      if (result.id) {
        openApp(result.id);
      }
      setManageOpen(false);
    }
    resetDraft();
  };

  const manageModal = (
    <WorkspaceManageModal
      open={manageOpen}
      onClose={() => {
        setManageOpen(false);
        resetDraft();
      }}
      apps={apps}
      formError={formError}
      editingId={editingId}
      draftName={draftName}
      draftUrl={draftUrl}
      setDraftName={setDraftName}
      setDraftUrl={setDraftUrl}
      saveDraft={saveDraft}
      startEdit={startEdit}
      resetDraft={resetDraft}
      removeApp={removeApp}
      moveApp={moveApp}
      openApp={openApp}
      confirm={confirm}
    />
  );

  const sectionShellClass = nested
    ? "space-y-0.5"
    : "mt-2 space-y-0.5 border-t border-border pt-2";
  const expandedWrapClass = nested ? "mt-0.5" : "mt-2 border-t border-border pt-2";

  if (collapsed) {
    return (
      <div className={sectionShellClass}>
        {hydrated
          ? apps.map((app) => (
              <Button
                key={app.id}
                type="button"
                variant="ghost"
                className="h-8 w-full px-0 text-xs font-medium"
                title={app.name}
                aria-label={`Open ${app.name}`}
                onClick={() => openApp(app.id)}
              >
                {app.name.slice(0, 1).toUpperCase()}
              </Button>
            ))
          : null}
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full px-0"
          title="Manage workspace apps"
          aria-label="Manage workspace apps"
          onClick={() => setManageOpen(true)}
        >
          ⊞
        </Button>
        {manageModal}
      </div>
    );
  }

  return (
    <div className={expandedWrapClass}>
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-muted ${
          nested
            ? "text-xs normal-case tracking-normal"
            : "text-[0.6875rem] uppercase tracking-wide"
        }`}
        onClick={toggleSection}
        aria-expanded={expanded}
      >
        <span className="truncate">
          Workspace apps
          {hydrated && apps.length ? (
            <span className="ml-1 font-normal normal-case text-muted-foreground">
              ({apps.length})
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs" suppressHydrationWarning>
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-1 space-y-1">
          {!hydrated ? (
            <p className="px-2 text-xs text-muted-foreground">Loading…</p>
          ) : apps.length ? (
            apps.map((app) => (
              <button
                key={app.id}
                type="button"
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                onClick={() => openApp(app.id)}
                title={app.url}
              >
                <span className="truncate">{app.name}</span>
              </button>
            ))
          ) : (
            <p className="px-2 text-xs text-muted-foreground">No apps yet</p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-1 h-8 w-full text-xs"
            onClick={() => {
              resetDraft();
              setManageOpen(true);
            }}
          >
            Manage apps
          </Button>
        </div>
      ) : null}

      {manageModal}
    </div>
  );
}

function WorkspaceManageModal({
  open,
  onClose,
  apps,
  formError,
  editingId,
  draftName,
  draftUrl,
  setDraftName,
  setDraftUrl,
  saveDraft,
  startEdit,
  resetDraft,
  removeApp,
  moveApp,
  openApp,
  confirm,
}) {
  return (
    <Modal
      open={open}
      title="Workspace apps"
      onClose={onClose}
      panelClassName="max-w-md"
    >
      <p className="text-sm text-muted-foreground">
        Add URLs for your other apps. Open them from the sidebar; each opens in a tab on
        the Workspace page.
      </p>

      {formError ? (
        <div className="mt-3">
          <Alert variant="error">{formError}</Alert>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <label className="block space-y-1 text-xs font-medium">
          <span>Name</span>
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="My other app"
          />
        </label>
        <label className="block space-y-1 text-xs font-medium">
          <span>URL</span>
          <Input
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="https://localhost:3001"
          />
        </label>
        <div className="flex gap-2">
          <Button type="button" onClick={saveDraft}>
            {editingId ? "Save changes" : "Add app"}
          </Button>
          {editingId ? (
            <Button type="button" variant="secondary" onClick={resetDraft}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </div>

      {apps.length ? (
        <ul className="mt-4 max-h-56 space-y-1.5 overflow-y-auto border-t border-border pt-3">
          {apps.map((app, index) => (
            <li
              key={app.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left hover:opacity-80"
                onClick={() => {
                  openApp(app.id);
                  onClose();
                }}
              >
                <p className="truncate font-medium">{app.name}</p>
                <p className="truncate text-[0.6875rem] text-muted-foreground">
                  {app.url}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => startEdit(app)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 w-7 px-0"
                  disabled={index === 0}
                  aria-label="Move up"
                  onClick={() => moveApp(app.id, "up")}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 w-7 px-0"
                  disabled={index === apps.length - 1}
                  aria-label="Move down"
                  onClick={() => moveApp(app.id, "down")}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Remove app?",
                      description:
                        "This removes it from the sidebar. Open tabs for this app will close.",
                      confirmLabel: "Remove",
                      variant: "danger",
                    });
                    if (ok) {
                      removeApp(app.id);
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          No apps yet. Add a name and URL above.
        </p>
      )}
    </Modal>
  );
}
