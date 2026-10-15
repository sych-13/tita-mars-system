import { useSession } from "../context/SessionContext";
import Icon from "./Icon";
import Modal from "./Modal";

const countdownLabel = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return `0:${String(safeSeconds).padStart(2, "0")}`;
};

export default function SessionTimeoutWarning() {
  const {
    sessionWarningSeconds,
    staySignedIn,
    user,
  } = useSession();

  if (!user || sessionWarningSeconds === null) return null;

  return (
    <Modal
      title="Your session is about to expire"
      onClose={staySignedIn}
      className="session-timeout-modal"
    >
      <div className="session-timeout-content" role="alert" aria-live="assertive">
        <span className="session-timeout-icon">
          <Icon name="clock" size={28} weight="fill" />
        </span>
        <p>
          You have been inactive. For your account security, you will be logged
          out automatically in:
        </p>
        <strong className="session-timeout-countdown">
          {countdownLabel(sessionWarningSeconds)}
        </strong>
        <small>
          Moving the mouse, typing, touching, scrolling, or choosing Stay
          signed in will continue your session.
        </small>
        <div className="session-timeout-actions">
          <button type="button" className="btn-brand" onClick={staySignedIn}>
            <Icon name="check" size={17} /> Stay signed in
          </button>
        </div>
      </div>
    </Modal>
  );
}
