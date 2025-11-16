import { useState, useEffect, memo } from "react";
import Notification from "./Notification";
import { useTranslation } from "../hooks/useTranslation";
import { getBackNumber } from "../utils/cardBacks";
import { validateCardReveal } from "../utils/cardValidation";

const PRESS_DURATION = 1500;
const PROGRESS_INTERVAL = 50;
const FLIP_DELAY = 2000;

const GameCard = ({
  word,
  color,
  revealed,
  onConfirm,
  isCaptain,
  gameKey,
  position,
  myTeam = null,
  myRole = null,
  isAuthenticated = false,
  onAuthRequired,
  currentTeam = "blue",
  teams = null,
  currentHint = null,
  onHighlightIcon,
  gameSettings = {}
}) => {
  const { t } = useTranslation();
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [flipped, setFlipped] = useState(false);

  // flip при загрузке/смене состояния
  useEffect(() => {
    let timer;
    if (revealed || isCaptain) {
      timer = setTimeout(() => setFlipped(true), FLIP_DELAY);
    } else {
      setFlipped(false);
    }
    return () => clearTimeout(timer);
  }, [revealed, isCaptain]);

  const getCardStyle = () => {
    const base = "game-card";
    const flip = flipped && !isCaptain ? " card-flipped" : "";
    const colorClass = revealed || isCaptain ? ` card-${color}` : " card-unrevealed";

    // Добавляем класс рубашки для нераскрытых карт
    let backClass = "";
	if (gameKey) {
	  const backNumber = getBackNumber(gameKey, position, color);
	  backClass = ` card-back-${color}-${backNumber}`;
	}
    
    return base + flip + colorClass + backClass;
  };

  const startPress = (e) => {
    // Валидация через единую функцию
    const error = validateCardReveal({
      revealed,
      isAuthenticated,
      simpleMode: gameSettings?.simpleMode,
      isCaptain,
      myRole,
      teams,
      myTeam,
      currentTeam,
      currentHint,
    });

    // Если есть ошибка - обрабатываем
    if (error) {
      e.preventDefault();

      // Специальная обработка для авторизации
      if (error.code === 'NOT_AUTHENTICATED' && onAuthRequired) {
        onAuthRequired();
        return;
      }

      // Показываем уведомление
      setNotificationMessage(t(error.message));
      setShowNotification(true);

      // Подсвечиваем иконку если нужно
      if (error.highlight) {
        onHighlightIcon?.(error.highlight);
      }

      return;
    }

    e.preventDefault();
    setPressing(true);
    setProgress(0);

    const pressTimeout = setTimeout(() => {
      setPressing(false);
      setProgress(0);
      onConfirm(position);
      setTimeout(() => setFlipped(true), FLIP_DELAY);
    }, PRESS_DURATION);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += (100 * PROGRESS_INTERVAL) / PRESS_DURATION;
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
      } else {
        setProgress(currentProgress);
      }
    }, PROGRESS_INTERVAL);

    const stop = () => {
      clearTimeout(pressTimeout);
      clearInterval(progressInterval);
      setPressing(false);
      setProgress(0);
    };

    e.target.onpointerup = stop;
    e.target.onpointerleave = stop;
  };

  return (
    <>
      <div
        className={getCardStyle()}
        onPointerDown={startPress}
        style={{
          animationDelay: `${position * 0.03}s` // Задержка 30ms между карточками (25 карточек = 750ms всего)
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: `${progress}%`,
            height: "100%",
            backgroundColor: pressing ? "rgba(0, 0, 0, 0.1)" : "transparent",
            transition: "width 50ms linear",
            pointerEvents: "none",
            zIndex: 15,
          }}
        />
        <div className="card-content">
          <span className="card-word">{word}</span>
        </div>
      </div>
      <Notification
        message={notificationMessage}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

// Мемоизация для предотвращения лишних ре-рендеров
export default memo(GameCard, (prevProps, nextProps) => {
  return (
    prevProps.word === nextProps.word &&
    prevProps.color === nextProps.color &&
    prevProps.revealed === nextProps.revealed &&
    prevProps.isCaptain === nextProps.isCaptain &&
    prevProps.gameKey === nextProps.gameKey &&
    prevProps.position === nextProps.position &&
    prevProps.myTeam === nextProps.myTeam &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    prevProps.currentTeam === nextProps.currentTeam &&
    prevProps.teams === nextProps.teams &&
    prevProps.currentHint === nextProps.currentHint &&
    prevProps.gameSettings?.simpleMode === nextProps.gameSettings?.simpleMode
  );
});
