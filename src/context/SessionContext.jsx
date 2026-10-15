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
  FacebookAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as signOutFromFirebase,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getAccounts, hashPassword, saveAccount } from "../utils/accounts";
import { firebaseAuth, firebaseConfigured, firestore } from "../lib/firebase";
import { emailActionUrl, normalizeEmail } from "../utils/emailAuth";
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
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase yet.";
    case "auth/account-exists-with-different-credential":
      return "An account already uses this email. Sign in with its existing method, then connect this social account from My Profile.";
    case "auth/credential-already-in-use":
      return "This social account is already connected to another Tita Mars account.";
    case "auth/provider-already-linked":
      return "This social account is already connected.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for Tita Mars, then try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The sign-in window was closed before login was completed.";
    case "auth/unauthorized-domain":
      return "This website domain is not authorized in Firebase Authentication.";
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

const actionUrl = (route) =>
  emailActionUrl(route, window.location.origin, import.meta.env.BASE_URL);

const socialProvider = (providerName) => {
  if (providerName === "google") {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }
  if (providerName === "facebook") {
    const provider = new FacebookAuthProvider();
    provider.addScope("email");
    return provider;
  }
  throw new Error("Unsupported social sign-in provider.");
};

const providerIdsFor = (authUser) =>
  authUser?.providerData?.map((provider) => provider.providerId) || [];

export function SessionProvider({ children }) {
  const authFlowInProgress = useRef(false);
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
  const [authProviders, setAuthProviders] = useState([]);
  const role = user?.role || (firebaseConfigured ? "customer" : demoRole);

  useEffect(() => {
    if (!firebaseConfigured || !firebaseAuth || !firestore) return undefined;
    let unsubscribeProfile = () => {};
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (authUser) => {
      unsubscribeProfile();
      if (!authUser) {
        setUser(null);
        setAuthProviders([]);
        setReady(true);
        return;
      }
      if (!authUser.emailVerified) {
        if (authFlowInProgress.current) {
          setReady(false);
          return;
        }
        setUser(null);
        setDemoRole("customer");
        signOutFromFirebase(firebaseAuth).catch(() => {});
        setReady(true);
        return;
      }
      unsubscribeProfile = onSnapshot(
        doc(firestore, "profiles", authUser.uid),
        (snapshot) => {
          if (!snapshot.exists() || snapshot.data().active === false) {
            if (!snapshot.exists() && authFlowInProgress.current) {
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
          setAuthProviders(providerIdsFor(authUser));
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
        let credential;
        authFlowInProgress.current = true;
        try {
          const normalizedEmail = normalizeEmail(email);
          credential = await signInWithEmailAndPassword(
            firebaseAuth,
            normalizedEmail,
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
          const account = profileFor(
            credential.user,
            profileSnapshot.data(),
          );
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
          if (!credential.user.emailVerified) {
            await sendEmailVerification(credential.user, {
              url: actionUrl(`login?role=${account.role}&verified=1`),
            });
            await signOutFromFirebase(firebaseAuth);
            return {
              ok: true,
              emailVerificationSent: true,
              email: normalizedEmail,
            };
          }

          setUser(account);
          setAuthProviders(providerIdsFor(credential.user));
          setDemoRole(account.role);
          setReady(true);
          return { ok: true, account };
        } catch (error) {
          if (
            credential?.user &&
            firebaseAuth.currentUser?.uid === credential.user.uid
          )
            await signOutFromFirebase(firebaseAuth).catch(() => {});
          return {
            ok: false,
            error: messageForAuthError(error, "Unable to sign in. Please try again."),
          };
        } finally {
          authFlowInProgress.current = false;
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
      authFlowInProgress.current = true;
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
        await sendEmailVerification(credential.user, {
          url: actionUrl("login?role=customer&verified=1"),
        });
        await signOutFromFirebase(firebaseAuth);
        setUser(null);
        setDemoRole("customer");
        return {
          ok: true,
          emailVerificationSent: true,
          email: profile.email,
        };
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
        authFlowInProgress.current = false;
      }
    }

    const result = await saveAccount({ ...data, role: "customer" });
    if (result.ok) {
      setUser(result.account);
      setDemoRole("customer");
    }
    return result;
  }, []);

  const loginWithSocial = useCallback(async (providerName) => {
    if (!firebaseConfigured || !firebaseAuth || !firestore)
      return {
        ok: false,
        error: "Social sign-in is available in the Firebase version.",
      };

    authFlowInProgress.current = true;
    let credential;
    try {
      credential = await signInWithPopup(
        firebaseAuth,
        socialProvider(providerName),
      );
      const authUser = credential.user;
      if (!authUser.email) {
        await signOutFromFirebase(firebaseAuth);
        return {
          ok: false,
          error:
            "This social account did not share an email address. Allow email access, then try again.",
        };
      }
      if (!authUser.emailVerified) {
        await signOutFromFirebase(firebaseAuth);
        return {
          ok: false,
          error:
            "This social account does not have a verified email. Use a verified account or register with email.",
        };
      }

      const profileRef = doc(firestore, "profiles", authUser.uid);
      const profileSnapshot = await getDoc(profileRef);
      let account;

      if (profileSnapshot.exists()) {
        account = profileFor(authUser, profileSnapshot.data());
        if (!account.active) {
          await signOutFromFirebase(firebaseAuth);
          return { ok: false, error: "This account is currently inactive." };
        }
      } else {
        const timestamp = new Date().toISOString();
        const profile = {
          name: authUser.displayName?.trim() || "Tita Mars customer",
          email: authUser.email.toLowerCase(),
          phone: "",
          address: "",
          role: "customer",
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await setDoc(profileRef, profile);
        account = profileFor(authUser, profile);
      }

      setUser(account);
      setAuthProviders(providerIdsFor(authUser));
      setDemoRole(account.role);
      return { ok: true, account };
    } catch (error) {
      if (credential?.user) await signOutFromFirebase(firebaseAuth).catch(() => {});
      return {
        ok: false,
        error: messageForAuthError(
          error,
          `Unable to sign in with ${providerName === "facebook" ? "Facebook" : "Google"}. Please try again.`,
        ),
      };
    } finally {
      authFlowInProgress.current = false;
    }
  }, []);

  const linkSocialProvider = useCallback(async (providerName) => {
    if (!firebaseConfigured || !firebaseAuth?.currentUser)
      return { ok: false, error: "Sign in before connecting an account." };
    try {
      const credential = await linkWithPopup(
        firebaseAuth.currentUser,
        socialProvider(providerName),
      );
      const providers = providerIdsFor(credential.user);
      setAuthProviders(providers);
      return { ok: true, providers };
    } catch (error) {
      return {
        ok: false,
        error: messageForAuthError(
          error,
          `Unable to connect ${providerName === "facebook" ? "Facebook" : "Google"}.`,
        ),
      };
    }
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
      authProviders,
      login,
      loginWithSocial,
      register,
      setupOwner,
      updateProfile,
      linkSocialProvider,
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
      authProviders,
      linkSocialProvider,
      login,
      loginWithSocial,
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
