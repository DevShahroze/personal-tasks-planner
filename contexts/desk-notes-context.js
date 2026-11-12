"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { getQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-client";
import { deskNotesApi } from "@/lib/api-client";
import {
  clearDeskNoteSession,
  loadDeskNoteSession,
  saveDeskNoteSession,
} from "@/lib/desk-notes/storage.js";
import { MAX_DESK_NOTE_CONTENT_LENGTH } from "@/lib/desk-notes/constants.js";
import { limitRichText } from "@/lib/rich-text/field.js";
import { isRichTextEmpty } from "@/lib/rich-text/plain-text.js";
import {
  useDeskNoteMutations,
  useDeskNotesList,
} from "@/hooks/use-desk-notes";

const DeskNotesContext = createContext(null);

function isOnNotesPath(pathname) {
  return pathname === "/notes" || pathname.startsWith("/notes/");
}

export function DeskNotesProvider({ children }) {
  const pathname = usePathname();
  const onNotes = isOnNotesPath(pathname);
  const listQuery = useDeskNotesList(onNotes);
  const { create, update, remove } = useDeskNoteMutations();
  const queryClient = getQueryClient();

  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState("");
  const [savedDraft, setSavedDraft] = useState("");
  const [loadingNote, setLoadingNote] = useState(false);
  const savingRef = useRef(false);
  const draftRef = useRef("");
  const savedDraftRef = useRef("");
  const readEditorDraftRef = useRef(null);

  const isDirty = draft !== savedDraft;

  const syncSession = useCallback((id, content) => {
    if (!id) {
      clearDeskNoteSession();
      return;
    }
    saveDeskNoteSession({ id, content });
  }, []);

  const applyLoadedNote = useCallback(
    (note) => {
      const content = note?.content ?? "";
      setActiveId(note?._id ?? null);
      setDraft(content);
      setSavedDraft(content);
      draftRef.current = content;
      savedDraftRef.current = content;
      if (note?._id) {
        syncSession(note._id, content);
      }
    },
    [syncSession],
  );

  const startNewNote = useCallback(() => {
    setActiveId(null);
    setDraft("");
    setSavedDraft("");
    draftRef.current = "";
    savedDraftRef.current = "";
    clearDeskNoteSession();
  }, []);

  const registerEditorFlush = useCallback((fn) => {
    readEditorDraftRef.current = fn;
  }, []);

  const resolveDraftForSave = useCallback(() => {
    const flushed = readEditorDraftRef.current?.();
    const content = limitRichText(
      typeof flushed === "string" ? flushed : draftRef.current,
      MAX_DESK_NOTE_CONTENT_LENGTH,
    );
    draftRef.current = content;
    setDraft(content);
    return content;
  }, []);

  const flushSave = useCallback(async () => {
    const content = resolveDraftForSave();
    const saved = savedDraftRef.current;
    if (isRichTextEmpty(content) || content === saved || savingRef.current) {
      return;
    }
    savingRef.current = true;
    try {
      if (!activeId) {
        const created = await create.mutateAsync({ content });
        setActiveId(created._id);
        setSavedDraft(created.content);
        setDraft(created.content);
        draftRef.current = created.content;
        savedDraftRef.current = created.content;
        syncSession(created._id, created.content);
      } else {
        const updated = await update.mutateAsync({
          id: activeId,
          body: { content },
        });
        setSavedDraft(updated.content);
        setDraft(updated.content);
        draftRef.current = updated.content;
        savedDraftRef.current = updated.content;
        syncSession(activeId, updated.content);
      }
    } finally {
      savingRef.current = false;
    }
  }, [activeId, create, resolveDraftForSave, syncSession, update]);

  const selectNote = useCallback(
    async (id) => {
      if (id === activeId && draft === savedDraft) {
        return;
      }
      if (draft !== savedDraft) {
        await flushSave();
      }
      const cached = queryClient.getQueryData(queryKeys.deskNote(id));
      if (cached?.content !== undefined) {
        applyLoadedNote(cached);
        return;
      }
      const session = loadDeskNoteSession();
      if (session?.id === id && typeof session.content === "string") {
        applyLoadedNote({ _id: id, content: session.content });
        return;
      }
      setLoadingNote(true);
      try {
        const note = await deskNotesApi.get(id);
        queryClient.setQueryData(queryKeys.deskNote(id), note);
        applyLoadedNote(note);
      } finally {
        setLoadingNote(false);
      }
    },
    [activeId, applyLoadedNote, draft, flushSave, queryClient, savedDraft],
  );

  const save = useCallback(async () => {
    if (!isDirty) {
      return;
    }
    await flushSave();
  }, [flushSave, isDirty]);

  const deleteNote = useCallback(
    async (id) => {
      await remove.mutateAsync(id);
      if (activeId === id) {
        startNewNote();
      }
      clearDeskNoteSession();
    },
    [activeId, remove, startNewNote],
  );

  const setDraftContent = useCallback(
    (value) => {
      const next = limitRichText(String(value ?? ""), MAX_DESK_NOTE_CONTENT_LENGTH);
      draftRef.current = next;
      setDraft(next);
      if (activeId) {
        syncSession(activeId, next);
      }
    },
    [activeId, syncSession],
  );

  const leaveNotesSection = useCallback(async () => {
    await flushSave();
    clearDeskNoteSession();
    queryClient.removeQueries({ queryKey: ["desk-note"] });
  }, [flushSave, queryClient]);

  const wasOnNotes = useRef(false);
  useEffect(() => {
    const leaving = wasOnNotes.current && !onNotes;
    wasOnNotes.current = onNotes;
    if (!leaving) {
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      await leaveNotesSection();
      if (cancelled) {
        return;
      }
      setActiveId(null);
      setDraft("");
      setSavedDraft("");
      draftRef.current = "";
      savedDraftRef.current = "";
    })();
    return () => {
      cancelled = true;
    };
  }, [leaveNotesSection, onNotes]);

  useEffect(() => {
    const onPageHide = () => {
      clearDeskNoteSession();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    if (!onNotes) {
      return;
    }
    const session = loadDeskNoteSession();
    if (session?.id && typeof session.content === "string") {
      /* eslint-disable react-hooks/set-state-in-effect -- restore active note draft from session storage after mount */
      setActiveId(session.id);
      setDraft(session.content);
      setSavedDraft(session.content);
      /* eslint-enable react-hooks/set-state-in-effect */
      draftRef.current = session.content;
      savedDraftRef.current = session.content;
    }
  }, [onNotes]);

  const value = useMemo(
    () => ({
      onNotes,
      listQuery,
      items: listQuery.data?.items || [],
      activeId,
      draft,
      savedDraft,
      isDirty,
      loadingNote,
      saving: create.isPending || update.isPending,
      startNewNote,
      selectNote,
      setDraftContent,
      save,
      deleteNote,
      leaveNotesSection,
      clearDeskNoteSession,
      registerEditorFlush,
    }),
    [
      activeId,
      create.isPending,
      deleteNote,
      draft,
      isDirty,
      leaveNotesSection,
      listQuery,
      loadingNote,
      onNotes,
      save,
      savedDraft,
      selectNote,
      setDraftContent,
      registerEditorFlush,
      startNewNote,
      update.isPending,
    ],
  );

  return (
    <DeskNotesContext.Provider value={value}>{children}</DeskNotesContext.Provider>
  );
}

export function useDeskNotes() {
  const ctx = useContext(DeskNotesContext);
  if (!ctx) {
    throw new Error("useDeskNotes must be used within DeskNotesProvider");
  }
  return ctx;
}
