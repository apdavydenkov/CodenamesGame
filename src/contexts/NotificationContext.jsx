import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';
import { createPortal } from 'react-dom';

const NotificationContext = createContext(null);

const DURATION = 5000;

export const useNotify = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notice, setNotice] = useState(null);

  const hide = useEffectEvent(() => setNotice(null));

  useEffect(() => {
    if (!notice) return;

    const timeoutId = setTimeout(hide, DURATION);
    // Перехват: касание, вызвавшее подсказку, эту фазу уже прошло и её не закроет
    document.addEventListener('pointerdown', hide, true);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('pointerdown', hide, true);
    };
  }, [notice]);

  return (
    <NotificationContext.Provider value={setNotice}>
      {children}
      {notice && createPortal(
        <div className="fixed inset-x-0 top-1/2 z-[1000] flex -translate-y-1/2 justify-center px-2 pointer-events-none">
          <div className="max-w-full rounded-lg bg-black/90 px-6 py-4 text-base text-center text-white select-none max-[768px]:max-w-[80vw] max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-sm">
            {notice}
          </div>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};
