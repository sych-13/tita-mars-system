import Icon from "./Icon";
import { useSession } from "../context/SessionContext";
export default function LogoutPage() {
  const { signOut } = useSession();
  return (
    <section className="container page-section narrow-page">
      <div className="simple-card logout-card">
        <Icon name="logout" size={40} />
        <h1>Ready to log out?</h1>
        <p>Your orders and saved changes will be here when you come back.</p>
        <button
          className="btn-brand full-button"
          onClick={() => {
            signOut();
            window.location.hash = "home";
          }}
        >
          Logout
        </button>
        <button
          className="btn-secondary full-button"
          onClick={() => history.back()}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
