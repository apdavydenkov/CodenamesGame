import { useEffect } from "react";
import ReactDOM from "react-dom";

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
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
      <div className={`bg-black/90 text-white px-6 py-4 rounded-lg text-base text-center whitespace-nowrap select-none transition-opacity duration-200 max-[768px]:text-sm max-[768px]:px-5 max-[768px]:py-3 max-[768px]:max-w-[90vw] max-[768px]:whitespace-normal ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}>
        {message}
      </div>
    </div>,
    document.body
  );
};

export default Notification;
