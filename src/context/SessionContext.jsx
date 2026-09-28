import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as signOutFromFirebase,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getAccounts, hashPassword, saveAccount } from "../utils/accounts";
import { firebaseAuth, firebaseConfigured, firestore } from "../lib/firebase";
import { readStorage, writeStorage } from "../utils/storage";

const SessionContext = createContext();
const SESSION_KEY = "tita-mars-session";

const messageForAuthError = (error, fallback) => {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "This email already has an account. Please log in instead.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Use a password with at least 8 characters.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Enter a valid email address.";
    case "auth/network-request-failed":
      return "Check your internet connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment, then try again.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Your account does not have permission for that action.";
    default:
      return fallback;
  }
};

const profileFor = (authUser, profile) => ({
  id: authUser.uid,
  name: profile.name || authUser.displayName || "Tita Mars customer",
  email: profile.email || authUser.email || "",
  phone: profile.phone || "",
  address: profile.address || "",
  role: profile.role || "customer",
  active: profile.active !== false,
  createdAt: profile.createdAt || null,
  updatedAt: profile.updatedAt || null,
});

export function SessionProvider({ children }) {
  const registrationInProgress = useRef(false);
  const [user, setUser] = useState(() => {
    if (firebaseConfigured) return null;
    const saved = readStorage(SESSION_KEY, null);
    return saved
      ? getAccounts().find(
          (account) => account.id === saved.id && account.active,
        ) || null
      : null;
  });
  const [demoRole, setDemoRole] = useState(
    () => localStorage.getItem("tita-mars-role") || "customer",
  );
  const [ready, setReady] = useState(!firebaseConfigured);
  const role = user?.role || (firebaseConfigured ? "customer" : demoRole);

  useEffect(() => {
    if (!firebaseConfigured || !firebaseAuth || !firestore) return undefined;
    let unsubscribeProfile = () => {};
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (authUser) => {
      unsubscribeProfile();
      if (!authUser) {
        setUser(null);
        setReady(true);
        return;
      }
      unsubscribeProfile = onSnapshot(
        doc(firestore, "profiles", authUser.uid),
        (snapshot) => {
          if (!snapshot.exists() || snapshot.data().active === false) {
            if (!snapshot.exists() && registrationInProgress.current) {
              setReady(false);
              return;
            }
            setUser(null);
            setDemoRole("customer");
            signOutFromFirebase(firebaseAuth).catch(() => {});
            setReady(true);
            return;
          }
          const account = profileFor(authUser, snapshot.data());
          setUser(account);
          setDemoRole(account.role);
          setReady(true);
        },
        () => {
          setUser(null);
          setReady(true);
        },
      );
    });
    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("tita-mars-role", role);
    if (!firebaseConfigured)
      writeStorage(SESSION_KEY, user ? { id: user.id } : null);
  }, [role, user]);

  const login = useCallback(
    async (email, password, selectedRole) => {
      if (firebaseConfigured && firebaseAuth && firestore) {
        try {
          const credential = await signInWithEmailAndPassword(
            firebaseAuth,
            email.trim(),
            password,
          );
          const profileSnapshot = await getDoc(
            doc(firestore, "profiles", credential.user.uid),
          );
          if (!profileSnapshot.exists()) {
            await signOutFromFirebase(firebaseAuth);
            return {
              ok: false,
              error:
                "This account has no Tita Mars role yet. Ask the owner to assign it.",
            };
          }
          const account = profileFor(credential.user, profileSnapshot.data());
          if (!account.active) {
            await signOutFromFirebase(firebaseAuth);
            return { ok: false, error: "This account is currently inactive." };
          }
          if (account.role !== selectedRole) {
            await signOutFromFirebase(firebaseAuth);
            return {
              ok: false,
              error: `This email is registered as ${account.role}, not ${selectedRole}.`,
            };
          }
          setUser(account);
          setDemoRole(account.role);
          return { ok: true, account };
        } catch (error) {
          return {
            ok: false,
            error: messageForAuthError(error, "Unable to sign in. Please try again."),
          };
        }
      }

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
    },
    [],
  );

  const register = useCallback(async (data) => {
    if (firebaseConfigured && firebaseAuth && firestore) {
      registrationInProgress.current = true;
      try {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          data.email.trim(),
          data.password,
        );
        const timestamp = new Date().toISOString();
        const profile = {
          name: data.name.trim(),
          email: credential.user.email || data.email.trim().toLowerCase(),
          phone: data.phone?.trim() || "",
          address: "",
          role: "customer",
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await setDoc(doc(firestore, "profiles", credential.user.uid), profile);
        await updateFirebaseProfile(credential.user, {
          displayName: profile.name,
        }).catch(() => {});
        const account = profileFor(credential.user, profile);
        setUser(account);
        setDemoRole("customer");
        return { ok: true, account };
      } catch (error) {
        if (firebaseAuth.currentUser)
          await signOutFromFirebase(firebaseAuth).catch(() => {});
        return {
          ok: false,
          error: messageForAuthError(
            error,
            "Unable to create this account. Please try again.",
          ),
        };
      } finally {
        registrationInProgress.current = false;
      }
    }

    const result = await saveAccount({ ...data, role: "customer" });
    if (result.ok) {
      setUser(result.account);
      setDemoRole("customer");
    }
    return result;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail)
      return { ok: false, error: "Enter your email address." };
    if (!firebaseConfigured || !firebaseAuth)
      return {
        ok: false,
        error: "Password reset email is available in the Firebase version.",
      };
    try {
      await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
      return { ok: true };
    } catch (error) {
      if (error?.code === "auth/user-not-found") return { ok: true };
      return {
        ok: false,
        error: messageForAuthError(
          error,
          "Unable to send the reset email. Please try again.",
        ),
      };
    }
  }, []);

  const setupOwner = useCallback(async (data) => {
    if (firebaseConfigured)
      return {
        ok: false,
        error:
          "For security, the first Firebase owner must be assigned from the Firebase project. See the owner setup note below.",
      };
    const result = await saveAccount({ ...data, role: "owner" });
    if (result.ok) {
      setUser(result.account);
      setDemoRole("owner");
    }
    return result;
  }, []);

  const updateProfile = useCallback(
    async (data) => {
      if (!user) return { ok: false, error: "Sign in to update your profile." };
      if (firebaseConfigured && firebaseAuth?.currentUser && firestore) {
        try {
          const changes = {
            name: data.name.trim(),
            email: user.email,
            phone: data.phone?.trim() || "",
            address: data.address?.trim() || "",
            role: user.role,
            active: user.active,
            updatedAt: new Date().toISOString(),
          };
          await updateDoc(doc(firestore, "profiles", user.id), changes);
          await updateFirebaseProfile(firebaseAuth.currentUser, {
            displayName: changes.name,
          });
          const account = { ...user, ...changes };
          setUser(account);
          return { ok: true, account };
        } catch (error) {
          return {
            ok: false,
            error: messageForAuthError(error, "Unable to save your profile."),
          };
        }
      }
      const result = await saveAccount({ ...user, ...data, role: user.role }, user.id);
      if (result.ok) setUser(result.account);
      return result;
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      role,
      ready,
      usingFirebase: firebaseConfigured,
      login,
      register,
      setupOwner,
      updateProfile,
      resetPassword,
      setRole: (next) => {
        if (firebaseConfigured) return;
        setUser(null);
        setDemoRole(next);
      },
      signOut: () => {
        if (firebaseConfigured && firebaseAuth)
          signOutFromFirebase(firebaseAuth).catch(() => {});
        setUser(null);
        setDemoRole("customer");
      },
      refreshUser: async (id) => {
        if (firebaseConfigured || !id) return;
        setUser(getAccounts().find((entry) => entry.id === id) || null);
      },
      hasOwner: firebaseConfigured
        ? true
        : getAccounts().some((account) => account.role === "owner"),
    }),
    [
      login,
      ready,
      register,
      resetPassword,
      role,
      setupOwner,
      updateProfile,
      user,
    ],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
