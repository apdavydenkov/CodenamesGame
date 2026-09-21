import { useState, useEffect, memo } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { useNotify } from "../contexts/NotificationContext";
import { getCardBack } from "../utils/cardBacks";
import { validateCardReveal } from "../utils/cardValidation";

const PRESS_DURATION = 1500;
const PROGRESS_INTERVAL = 50;
const WORD_LINGER = 2000;

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
  const notify = useNotify();
  const [progress, setProgress] = useState(0);
  const [holdHint, setHoldHint] = useState(false);
  const [wordFaded, setWordFaded] = useState(false);

  useEffect(() => {
    if (!revealed) return setWordFaded(false);

    const timer = setTimeout(() => setWordFaded(true), WORD_LINGER);
    return () => clearTimeout(timer);
  }, [revealed]);

  // Картинка рубашки и её зеркальность — через CSS-переменные, см. game.css
  const getBackVars = () => {
    if (!gameKey) return {};
    const { number, mirrored } = getCardBack(gameKey, position, color);
    return {
      "--card-back": `url('/images/card-${color}-back-${number}.webp')`,
      "--card-back-flip": mirrored ? -1 : 1,
    };
  };

  const startPress = (e) => {
    // Валидация через единую функцию
    const error = validateCardReveal({
      revealed,
      isAuthenticated,
      advancedMode: gameSettings?.advancedMode,
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
      notify(t(error.message));

      // Подсвечиваем иконку если нужно
      if (error.highlight) {
        onHighlightIcon?.(error.highlight);
      }

      return;
    }

    e.preventDefault();
    const target = e.target;

    const release = (event) => {
      target.onpointerup = target.onpointerleave = null;
      clearTimeout(pressTimeout);
      clearInterval(progressInterval);
      setProgress(0);

      // Отпустили раньше срока — показываем, что карточку надо держать
      if (event?.type === 'pointerup') {
        setHoldHint(true);
        notify(t('notifications.holdToReveal'));
      }
    };

    const pressTimeout = setTimeout(() => {
      release();
      onConfirm(position);
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

    target.onpointerup = release;
    target.onpointerleave = release;
  };

  return (
    <>
      <div
        className="game-card"
        onPointerDown={revealed ? undefined : startPress}
        style={{
          animationDelay: `${position * 0.03}s`, // Задержка 30ms между карточками (25 карточек = 750ms всего)
          ...getBackVars()
        }}
      >
        <div className={`card-inner${revealed || isCaptain ? " card-turned" : ""}`}>
          <div className="card-face card-front">
            <div className="card-content"><span className="card-word">{word}</span></div>
          </div>
          <div className={`card-face card-back card-${color}${wordFaded && !isCaptain ? " card-quiet" : ""}`}>
            <div className="card-content"><span className="card-word">{word}</span></div>
          </div>
        </div>
        <div
          className={`card-fill progress-fill${holdHint ? " progress-flash" : ""}`}
          style={{ "--fill": `${progress}%` }}
          onAnimationEnd={() => setHoldHint(false)}
        />
      </div>
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
    prevProps.gameSettings?.advancedMode === nextProps.gameSettings?.advancedMode
  );
});
