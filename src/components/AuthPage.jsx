import { useState } from "react";
import { assetUrl } from "../utils/assets";
import { useSession } from "../context/SessionContext";
import { useHashRoute } from "../hooks/useHashRoute";
import BrandMark from "./BrandMark";
import Icon from "./Icon";
import SocialIcon from "./SocialIcon";

export default function AuthPage({ mode = "login" }) {
  const { params, navigate } = useHashRoute();
  const {
    login,
    loginWithSocial,
    register,
    setupOwner,
    hasOwner,
    usingFirebase,
  } = useSession();
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
  const [socialBusy, setSocialBusy] = useState("");
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
  const destinationFor = () => "home";

  const continueWithSocial = async (provider) => {
    setError("");
    setSocialBusy(provider);
    try {
      const result = await loginWithSocial(provider);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(params.next || destinationFor(result.account));
    } catch {
      setError("Unable to open social sign-in. Please try again.");
    } finally {
      setSocialBusy("");
    }
  };

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
        if (result.emailVerificationSent) {
          setEmailStep({
            email: result.email,
          });
          return;
        }
        navigate(params.next || destinationFor(result.account));
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
            <p>Open the verification link before signing in.</p>
            <strong>{emailStep.email}</strong>
            <small>
              Also check your Spam folder. You only need to verify this email
              once.
            </small>
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
        {!emailStep && !setup && usingFirebase && (
          <div className="social-auth">
            <button
              className="social-auth-button"
              type="button"
              disabled={busy || Boolean(socialBusy)}
              onClick={() => continueWithSocial("google")}
            >
              <SocialIcon provider="google" />
              {socialBusy === "google"
                ? "Opening Google..."
                : `Continue with Google`}
            </button>
            <button
              className="social-auth-button"
              type="button"
              disabled={busy || Boolean(socialBusy)}
              onClick={() => continueWithSocial("facebook")}
            >
              <SocialIcon provider="facebook" />
              {socialBusy === "facebook"
                ? "Opening Facebook..."
                : `Continue with Facebook`}
            </button>
            {!signup && accountRole !== "customer" && (
              <small className="social-role-note">
                Connected {accountRole} accounts keep their assigned role. A
                new social account starts as a customer.
              </small>
            )}
            <div className="auth-divider" aria-hidden="true">
              <span>or use email</span>
            </div>
          </div>
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
