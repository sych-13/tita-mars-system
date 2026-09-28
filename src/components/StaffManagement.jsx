import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query as firestoreQuery,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAccounts, saveAccount, ACCOUNT_KEY } from "../utils/accounts";
import { writeStorage } from "../utils/storage";
import { createStaffAuthUser, firestore } from "../lib/firebase";
import { useShop } from "../context/ShopContext";
import { useSession } from "../context/SessionContext";
import DashboardLayout from "../layouts/DashboardLayout";
import Icon from "./Icon";
import Modal from "./Modal";
export default function StaffManagement() {
  const [accounts, setAccounts] = useState(getAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useShop();
  const { usingFirebase, user } = useSession();
  useEffect(() => {
    if (!usingFirebase || !firestore) {
      setAccounts(getAccounts());
      return undefined;
    }
    if (!user) {
      setAccounts([]);
      return undefined;
    }
    return onSnapshot(
      firestoreQuery(
        collection(firestore, "profiles"),
        where("role", "==", "staff"),
      ),
      (snapshot) =>
        setAccounts(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        ),
      () => setError("Unable to load staff accounts."),
    );
  }, [user, usingFirebase]);
  const staff = accounts.filter(
    (a) =>
      a.role === "staff" &&
      `${a.name} ${a.email}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );
  const save = async (e) => {
    e.preventDefault();
    setError("");
    if (!draft.id && draft.password !== draft.confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    let result;
    if (usingFirebase && firestore) {
      try {
        if (draft.id) {
          await updateDoc(doc(firestore, "profiles", draft.id), {
            name: draft.name.trim(),
            phone: draft.phone?.trim() || "",
            updatedAt: new Date().toISOString(),
          });
        } else {
          let staffAuthAccount;
          try {
            staffAuthAccount = await createStaffAuthUser(
              draft.email,
              draft.password,
            );
            const timestamp = new Date().toISOString();
            await setDoc(doc(firestore, "profiles", staffAuthAccount.uid), {
              name: draft.name.trim(),
              email: staffAuthAccount.email,
              phone: draft.phone?.trim() || "",
              address: "",
              role: "staff",
              active: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
            await staffAuthAccount.finish().catch(() => {});
          } catch (caught) {
            if (staffAuthAccount)
              await staffAuthAccount.discard().catch(() => {});
            throw caught;
          }
        }
        result = { ok: true };
      } catch (caught) {
        const messages = {
          "auth/email-already-in-use":
            "This email already has a Firebase account.",
          "auth/invalid-email": "Enter a valid email address.",
          "auth/weak-password": "Use a password with at least 8 characters.",
          "auth/operation-not-allowed":
            "Email/password sign-in is not enabled in Firebase.",
        };
        result = {
          ok: false,
          error:
            messages[caught?.code] ||
            (caught?.code === "permission-denied" ||
            caught?.code === "firestore/permission-denied"
              ? "Only the owner can create or edit staff profiles."
              : "Unable to save this staff profile."),
        };
      }
    } else result = await saveAccount({ ...draft, role: "staff" }, draft.id);
    setBusy(false);
    if (result.ok) {
      if (!usingFirebase) setAccounts(getAccounts());
      setDraft(null);
      notify("Staff account saved.");
    } else setError(result.error);
  };
  const toggle = async (account) => {
    if (usingFirebase && firestore) {
      try {
        await updateDoc(doc(firestore, "profiles", account.id), {
          active: !account.active,
          updatedAt: new Date().toISOString(),
        });
        notify(
          account.active
            ? "Staff account deactivated."
            : "Staff account restored.",
        );
      } catch {
        notify("Unable to update this staff account.");
      }
      return;
    }
    const next = accounts.map((a) =>
      a.id === account.id ? { ...a, active: !a.active } : a,
    );
    writeStorage(ACCOUNT_KEY, next);
    setAccounts(next);
    notify(
      account.active ? "Staff account deactivated." : "Staff account restored.",
    );
  };
  return (
    <DashboardLayout role="Owner / Admin">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Your team</p>
          <h1>Staff Management</h1>
          <p>Manage the people who keep Tita Mars running.</p>
        </div>
        <button
          className="btn-brand"
          onClick={() => {
            setDraft({
              name: "",
              email: "",
              password: "",
              confirm: "",
              phone: "",
              active: true,
            });
            setError("");
          }}
        >
          <Icon name="plus" size={17} />
          Add Staff
        </button>
      </header>
      <section className="simple-card">
        <div className="table-toolbar">
          <h2>
            Team members <small>{staff.length}</small>
          </h2>
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search staff"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
        <div
          className="table-scroll"
          tabIndex="0"
          role="region"
          aria-label="Scrollable data table"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                  </td>
                  <td>{a.email}</td>
                  <td>Staff</td>
                  <td>
                    <span
                      className={`stock-status ${a.active ? "available" : "out"}`}
                    >
                      {a.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setDraft({ ...a, password: "" });
                          setError("");
                        }}
                      >
                        <Icon name="edit" size={15} />
                        Edit
                      </button>
                      <button className="text-link" onClick={() => toggle(a)}>
                        {a.active ? "Deactivate" : "Restore"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!staff.length && (
          <div className="dashboard-empty">
            <Icon name="users" size={38} />
            <h3>Your team starts here</h3>
            <p>
              Add a staff member so they can sign in and manage orders.
            </p>
          </div>
        )}
      </section>
      {draft && (
        <Modal
          title={draft.id ? "Edit staff member" : "Add staff member"}
          onClose={() => setDraft(null)}
        >
          <form onSubmit={save}>
            {(
              draft.id
                ? [
                    ["name", "Full name", "text"],
                    ["phone", "Mobile number", "tel"],
                  ]
                : [
                    ["name", "Full name", "text"],
                    ["email", "Email address", "email"],
                    ["phone", "Mobile number", "tel"],
                    ["password", "Temporary password", "password"],
                    ["confirm", "Confirm password", "password"],
                  ]
            ).map(([name, label, type]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={type}
                  required={
                    name === "name" ||
                    name === "email" ||
                    (!draft.id && ["password", "confirm"].includes(name))
                  }
                  minLength={
                    ["password", "confirm"].includes(name) ? 8 : undefined
                  }
                  value={draft[name]}
                  onChange={(e) =>
                    setDraft({ ...draft, [name]: e.target.value })
                  }
                />
              </label>
            ))}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn-brand full-button" disabled={busy}>
              {busy
                ? "Saving…"
                : draft.id
                  ? "Save changes"
                  : "Create staff account"}
            </button>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
