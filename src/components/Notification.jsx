import { useEffect } from "react";
import ReactDOM from "react-dom";
import "../styles/notifications.css";

const Notification = ({ message, isVisible, duration = 5000, onClose }) => {
  useEffect(() => {
    let timeoutId;
    if (isVisible) {
      timeoutId = setTimeout(() => {
        onClose();
      }, duration);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return ReactDOM.createPortal(
    <div className="notification-container">
      <div className={`notification ${isVisible ? "visible" : ""}`}>
        {message}
      </div>
    </div>,
    document.body
  );
};

export default Notification;
