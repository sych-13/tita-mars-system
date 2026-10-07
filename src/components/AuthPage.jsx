import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../utils/assets";
import { useSession } from "../context/SessionContext";
import { useHashRoute } from "../hooks/useHashRoute";
import BrandMark from "./BrandMark";
import Icon from "./Icon";
export default function AuthPage({ mode = "login" }) {
  const { params, navigate } = useHashRoute();
  const { login, register, setupOwner, hasOwner, usingFirebase } = useSession();
  const accountRole = ["staff", "owner"].includes(params.role)
    ? params.role
    : "customer";
  const setup = mode === "setup";
  const signup = mode === "register";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailStep, setEmailStep] = useState(null);
  const title = setup
    ? "Set up your owner account"
    : signup
      ? "Create Account"
      : accountRole === "staff"
        ? "Staff Login"
        : accountRole === "owner"
          ? "Admin Login"
          : "Welcome Back!";
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if ((signup || setup) && form.password !== form.confirm) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      let result;
      if (setup) {
        if (hasOwner) {
          setError("An owner account already exists. Please log in.");
          return;
        }
        result = await setupOwner(form);
      } else
        result = signup
          ? await register(form)
          : await login(form.email, form.password, accountRole);
      if (result.ok) {
        if (result.emailVerificationSent || result.emailLoginSent) {
          setEmailStep({
            email: result.email,
            type: result.emailVerificationSent ? "verify" : "login",
          });
          return;
        }
        const defaultDestination =
          result.account.role === "owner"
            ? "owner"
            : result.account.role === "staff"
              ? "staff"
              : "home";
        navigate(params.next || defaultDestination);
      }
      else setError(result.error);
    } catch {
      setError("Unable to save this account. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-page container">
      <div className="auth-story">
        <img src={assetUrl("hero-food.png")} alt="A comforting Filipino meal" />
        <div>
          <p className="eyebrow">Welcome to Tita Mars</p>
          <h2>
            Good food.
            <br />
            Fresh bakes.
            <br />
            <em>Always.</em>
          </h2>
          <p>
            Masarap na pagkain,
            <br />
            sariwang bakery, para sa’yo!
          </p>
        </div>
      </div>
      <div className="auth-card">
        <BrandMark />
        <h1>{title}</h1>
        <p>
          {signup
            ? "A little closer to your next favorite meal."
            : "Your favorites are waiting for you."}
        </p>
        {!signup && !setup && (
          <div className="role-tabs">
            {[
              ["customer", "Customer"],
              ["staff", "Staff"],
              ["owner", "Owner"],
            ].map(([role, label]) => (
              <a
                href={`#login?${new URLSearchParams({
                  role,
                  ...(params.next ? { next: params.next } : {}),
                })}`}
                key={role}
                className={accountRole === role ? "selected" : ""}
              >
                {label}
              </a>
            ))}
          </div>
        )}
        {emailStep && (
          <div className="auth-email-sent" role="status">
            <span className="access-icon">
              <Icon name="email" size={22} />
            </span>
            <h2>Check your Gmail</h2>
            <p>
              {emailStep.type === "verify"
                ? "Open the verification link before signing in."
                : "Open the one-time sign-in link to finish logging in."}
            </p>
            <strong>{emailStep.email}</strong>
            <small>Also check your Spam folder. The link can only be used once.</small>
            <button
              className="btn-outline full-button"
              type="button"
              onClick={() => setEmailStep(null)}
            >
              Back
            </button>
          </div>
        )}
        {!emailStep && setup && usingFirebase && (
          <p className="form-error" role="status">
            The first owner profile is assigned securely in Firebase, not from
            this public form. Follow the owner setup step after deployment.
          </p>
        )}
        {!emailStep && <form onSubmit={submit}>
          {(signup || setup) && (
            <label>
              Full name
              <input
                required
                name="name"
                value={form.name}
                onChange={update}
                autoComplete="name"
                placeholder="Your full name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          {signup && (
            <label>
              Mobile number
              <input
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={update}
                placeholder="09XX XXX XXXX"
              />
            </label>
          )}
          <label>
            Password
            <div className="password-input">
              <input
                required
                minLength={signup || setup ? 8 : undefined}
                type={show ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={update}
                autoComplete={
                  signup || setup ? "new-password" : "current-password"
                }
                placeholder={
                  signup || setup
                    ? "At least 8 characters"
                    : "Enter your password"
                }
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                <Icon name={show ? "hidden" : "eye"} size={18} />
              </button>
            </div>
          </label>
          {(signup || setup) && (
            <label>
              Confirm password
              <input
                required
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={update}
                autoComplete="new-password"
                placeholder="Re-enter your password"
              />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn-brand full-button" disabled={busy}>
            {busy
              ? "Please wait…"
              : setup
                ? "Create owner account"
                : signup
                  ? "Register"
                  : "Login"}
            <Icon name="arrow" size={17} />
          </button>
        </form>}
        {!emailStep && !signup && !setup && (
          <a className="auth-forgot" href="#forgot-password">
            Forgot Password?
          </a>
        )}
        {!emailStep && <p className="auth-switch">
          {signup ? (
            <>
              Already have an account? <a href="#login">Login</a>
            </>
          ) : (
            <>
              Don’t have an account? <a href="#register">Register</a>
            </>
          )}
        </p>}
        {!emailStep && accountRole === "owner" && !hasOwner && !setup && (
          <a className="text-link" href="#setup">
            Set up first owner account <Icon name="arrow" size={15} />
          </a>
        )}
        {!emailStep && <p className="auth-local">
          <Icon name="lock" size={13} />
          {usingFirebase
            ? "Firebase accounts are shared securely across devices."
            : "Preview accounts are saved on this device."}
        </p>}
        {!emailStep && <a className="text-link" href="#catalog">
          Continue browsing <Icon name="arrow" size={15} />
        </a>}
      </div>
    </section>
  );
}

export function EmailLoginVerification() {
  const {
    completeEmailLogin,
    isEmailLoginLink,
    pendingEmailLogin,
    usingFirebase,
  } = useSession();
  const { navigate } = useHashRoute();
  const [email, setEmail] = useState(pendingEmailLogin?.email || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  const finish = async (address) => {
    setBusy(true);
    setError("");
    const result = await completeEmailLogin(address, window.location.href);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    const clean = new URL(import.meta.env.BASE_URL, window.location.origin);
    window.history.replaceState(null, "", `${clean.pathname}#verify-email`);
    navigate(result.next);
  };

  useEffect(() => {
    if (
      started.current ||
      !isEmailLoginLink ||
      !pendingEmailLogin?.email
    )
      return;
    started.current = true;
    finish(pendingEmailLogin.email);
  }, [isEmailLoginLink, pendingEmailLogin?.email]);

  return (
    <section className="page-section container narrow-page">
      <div className="simple-card email-verification-card">
        <Icon name="email" size={36} />
        <p className="eyebrow">Secure sign in</p>
        <h1>{busy ? "Verifying your link…" : "Confirm your email"}</h1>
        {!usingFirebase || !isEmailLoginLink ? (
          <p className="form-error" role="alert">
            This sign-in link is missing, invalid, or not available in this
            preview. Return to login and request a new link.
          </p>
        ) : pendingEmailLogin?.email ? (
          <p role="status">
            Signing in securely as <strong>{pendingEmailLogin.email}</strong>.
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              finish(email);
            }}
          >
            <p>
              Enter the same email address that received this one-time link.
            </p>
            <label>
              Email address
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <button className="btn-brand full-button" disabled={busy}>
              {busy ? "Verifying…" : "Verify and sign in"}
            </button>
          </form>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!busy && (
          <a className="btn-outline" href="#login">
            Request a new link
          </a>
        )}
      </div>
    </section>
  );
}
export function ForgotPassword() {
  const { resetPassword, usingFirebase } = useSession();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const result = await resetPassword(email);
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(result.error);
  };
  return (
    <section className="page-section container narrow-page">
      <div className="simple-card">
        <Icon name="lock" size={36} />
        <h1>Forgot your password?</h1>
        {sent ? (
          <p role="status">
            If an account exists for <strong>{email.trim()}</strong>, Firebase
            has sent its password-reset instructions. Check the inbox and spam
            folder.
          </p>
        ) : (
          <>
            <p>
              Enter the email used for your Customer, Staff, or Owner account.
            </p>
            <form onSubmit={submit}>
              <label>
                Email address
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn-brand full-button"
                disabled={busy || !usingFirebase}
              >
                {busy ? "Sending…" : "Send reset email"}
                <Icon name="arrow" size={16} />
              </button>
            </form>
            {!usingFirebase && (
              <p className="form-error" role="status">
                Password reset email requires the Firebase version of the app.
              </p>
            )}
          </>
        )}
        <a className="btn-brand" href="#login">
          Back to login <Icon name="arrow" size={16} />
        </a>
      </div>
    </section>
  );
}
