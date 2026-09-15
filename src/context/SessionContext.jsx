import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAccounts, hashPassword, saveAccount } from "../utils/accounts";
import { readStorage, writeStorage } from "../utils/storage";
const SessionContext = createContext();
export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = readStorage("tita-mars-session", null);
    return saved
      ? getAccounts().find(
          (account) => account.id === saved.id && account.active,
        ) || null
      : null;
  });
  const [demoRole, setDemoRole] = useState(
    () => localStorage.getItem("tita-mars-role") || "customer",
  );
  const role = user?.role || demoRole;
  useEffect(() => {
    writeStorage("tita-mars-session", user ? { id: user.id } : null);
    localStorage.setItem("tita-mars-role", role);
  }, [user, role]);
  const login = async (email, password, selectedRole) => {
    const account = getAccounts().find(
      (entry) =>
        entry.email === email.trim().toLowerCase() &&
        entry.role === selectedRole &&
        entry.active,
    );
    if (
      !account ||
      (await hashPassword(password, account.salt)) !== account.passwordHash
    )
      return {
        ok: false,
        error: "The email or password is incorrect for this account type.",
      };
    setUser(account);
    setDemoRole(account.role);
    return { ok: true, account };
  };
  const register = async (data) => {
    const result = await saveAccount({ ...data, role: "customer" });
    if (result.ok) {
      setUser(result.account);
      setDemoRole("customer");
    }
    return result;
  };
  const updateProfile = async (data) => {
    if (!user) return { ok: false, error: "Sign in to update your profile." };
    const result = await saveAccount(
      { ...user, ...data, role: user.role },
      user.id,
    );
    if (result.ok) setUser(result.account);
    return result;
  };
  const value = useMemo(
    () => ({
      user,
      role,
      login,
      register,
      updateProfile,
      setRole: (next) => {
        setUser(null);
        setDemoRole(next);
      },
      signOut: () => {
        setUser(null);
        setDemoRole("customer");
      },
      refreshUser: (id) =>
        setUser(getAccounts().find((entry) => entry.id === id) || null),
    }),
    [user, role],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
