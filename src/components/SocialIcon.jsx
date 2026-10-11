export default function SocialIcon({ provider, size = 22 }) {
  if (provider === "facebook") {
    return (
      <svg
        className="social-mark social-mark-facebook"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#FFFFFF"
          d="M13.65 24v-9.28h3.12l.47-3.62h-3.59V8.79c0-1.05.29-1.76 1.8-1.76h1.92V3.79c-.33-.04-1.47-.14-2.8-.14-2.77 0-4.67 1.69-4.67 4.8v2.65H6.76v3.62H9.9V24h3.75Z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="social-mark social-mark-google"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.29-2.66l-3.57-2.77c-.99.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.15A11 11 0 0 0 1 12c0 1.77.42 3.44 1.15 4.94l3.69-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.58 10.58 0 0 0 12 1 11 11 0 0 0 2.15 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37Z"
      />
    </svg>
  );
}
