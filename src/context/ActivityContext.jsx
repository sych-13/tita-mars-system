import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { firebaseConfigured, firestore } from "../lib/firebase";
import { readStorage, writeStorage } from "../utils/storage";
import { useSession } from "./SessionContext";

const ActivityContext = createContext();
const STORAGE_KEY = "tita-mars-audit-logs-v1";
const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function ActivityProvider({ children }) {
  const { user, role } = useSession();
  const [logs, setLogs] = useState(() =>
    firebaseConfigured ? [] : readStorage(STORAGE_KEY, []),
  );
  const logsRef = useRef(logs);

  const commitLogs = useCallback((updater) => {
    const next =
      typeof updater === "function" ? updater(logsRef.current) : updater;
    const sorted = [...next]
      .sort((left, right) =>
        String(right.createdAt || "").localeCompare(
          String(left.createdAt || ""),
        ),
      )
      .slice(0, 1000);
    logsRef.current = sorted;
    setLogs(sorted);
    return sorted;
  }, []);

  useEffect(() => {
    logsRef.current = logs;
    if (!firebaseConfigured) writeStorage(STORAGE_KEY, logs);
  }, [logs]);

  useEffect(() => {
    if (
      !firebaseConfigured ||
      !firestore ||
      !user ||
      !["staff", "owner"].includes(role)
    )
      return undefined;
    return onSnapshot(
      collection(firestore, "auditLogs"),
      (snapshot) =>
        commitLogs(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        ),
      () => commitLogs([]),
    );
  }, [commitLogs, role, user]);

  const logActivity = useCallback(
    async ({ action, entityType, entityId, summary }) => {
      if (!["staff", "owner"].includes(role)) return { ok: true };
      const id = createId();
      const entry = {
        id,
        action: String(action || "update").slice(0, 80),
        entityType: String(entityType || "system").slice(0, 80),
        entityId: String(entityId || "").slice(0, 160),
        summary: String(summary || "Activity recorded.").slice(0, 500),
        actorId: String(user?.id || role).slice(0, 160),
        actorName: String(user?.name || role).slice(0, 120),
        actorRole: role,
        createdAt: new Date().toISOString(),
      };
      if (firebaseConfigured && firestore && user) {
        try {
          await setDoc(doc(firestore, "auditLogs", id), entry);
          return { ok: true, entry };
        } catch {
          return { ok: false, error: "Unable to record the audit entry." };
        }
      }
      commitLogs((current) => [entry, ...current]);
      return { ok: true, entry };
    },
    [commitLogs, role, user],
  );

  const value = useMemo(
    () => ({ logs, logActivity }),
    [logActivity, logs],
  );
  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivity = () => useContext(ActivityContext);
