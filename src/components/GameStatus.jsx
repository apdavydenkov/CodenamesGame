import { useState, useEffect, useRef, memo } from "react";
import { Button } from "./Button";
import { FiMenu, FiMaximize, FiUserPlus, FiMessageCircle, FiStar, FiFileText, FiUser } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";

const PRESS_DURATION = 1000;
const PROGRESS_INTERVAL = 50;

const GameStatus = ({
  remainingCards,
  onMenuClick,
  onChatClick,
  isCaptain,
  isCaptainConfirmed,
  onCaptainModeToggle,
  onCaptainHelperClick,
  unreadCount = 0,
  isUserAuthorized = false,
  currentTeam = "blue",
  highlightMenuIcon = false,
  highlightCaptainIcon = false,
  onShowNotification,
  currentHint = null,
  hintTeam = null,
  onHintClick,
  teams = null,
}) => {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pressTimer = useRef(null);
  const progressTimer = useRef(null);
  const wasLongPress = useRef(false);

  // State для кнопки подсказки
  const [isHintGlowing, setIsHintGlowing] = useState(false);

  // Fullscreen button hide state
  const [isFullscreenButtonHidden, setIsFullscreenButtonHidden] = useState(
    () => localStorage.getItem('fullscreen-button-hidden') === 'true'
  );
  const [pressingFullscreen, setPressingFullscreen] = useState(false);
  const [progressFullscreen, setProgressFullscreen] = useState(0);
  const pressFullscreenTimer = useRef(null);
  const progressFullscreenTimer = useRef(null);
  const wasFullscreenLongPress = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Эффект для подсветки кнопки подсказки (30 секунд)
  useEffect(() => {
    if (!currentHint) {
      setIsHintGlowing(false);
      return;
    }

    const elapsed = Date.now() - currentHint.timestamp;
    const remaining = 30000 - elapsed;

    if (remaining <= 0) {
      setIsHintGlowing(false);
    } else {
      setIsHintGlowing(true);
      const timer = setTimeout(() => {
        setIsHintGlowing(false);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [currentHint?.timestamp]);

  const toggleFullscreen = async () => {
    // Определяем iOS (включая iPad на iPadOS 13+)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS && onShowNotification) {
      // На iOS показываем инструкцию с иконкой Share
      const ShareIcon = () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 3px' }}>
          <path d="M9 2L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 5L9 2L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 10L3 14C3 14.5523 3.44772 15 4 15L14 15C14.5523 15 15 14.5523 15 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );

      const PlusIcon = () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 3px' }}>
          <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 5L9 13M5 9L13 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );

      const message = (
        <span>
          Для полноэкранного режима: нажмите <ShareIcon /> потом <PlusIcon /> "На экран Домой"
          <br /><br />
          Удерживайте эту кнопку чтобы скрыть её
        </span>
      );

      onShowNotification(message, 7000); // iOS: 7 секунд
      return;
    }

    // Android/Desktop - показываем уведомление про скрытие
    if (onShowNotification) {
      onShowNotification('Удерживайте кнопку чтобы скрыть её', 5000); // Android: 5 секунд
    }

    // Обычный fullscreen для Android/Desktop
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen API may not be available
    }
  };

  const startFullscreenPress = (e) => {
    e.preventDefault();
    wasFullscreenLongPress.current = false;
    setPressingFullscreen(true);
    setProgressFullscreen(0);

    pressFullscreenTimer.current = setTimeout(() => {
      wasFullscreenLongPress.current = true;
      setPressingFullscreen(false);
      setProgressFullscreen(0);
      // Скрываем кнопку и сохраняем в localStorage
      localStorage.setItem('fullscreen-button-hidden', 'true');
      setIsFullscreenButtonHidden(true);
    }, PRESS_DURATION);

    let currentProgress = 0;
    progressFullscreenTimer.current = setInterval(() => {
      currentProgress += (100 * PROGRESS_INTERVAL) / PRESS_DURATION;
      if (currentProgress >= 100) {
        clearInterval(progressFullscreenTimer.current);
      } else {
        setProgressFullscreen(currentProgress);
      }
    }, PROGRESS_INTERVAL);
  };

  const endFullscreenPress = () => {
    if (pressFullscreenTimer.current) {
      clearTimeout(pressFullscreenTimer.current);
      clearInterval(progressFullscreenTimer.current);
      setPressingFullscreen(false);
      setProgressFullscreen(0);
    }
  };

  const handleFullscreenClick = () => {
    if (!pressingFullscreen && !wasFullscreenLongPress.current) {
      toggleFullscreen();
    }
    wasFullscreenLongPress.current = false;
  };

  const startCaptainPress = (e) => {
    e.preventDefault();
    wasLongPress.current = false;
    setPressing(true);
    setProgress(0);

    pressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      setPressing(false);
      setProgress(0);
      onCaptainModeToggle();
    }, PRESS_DURATION);

    let currentProgress = 0;
    progressTimer.current = setInterval(() => {
      currentProgress += (100 * PROGRESS_INTERVAL) / PRESS_DURATION;
      if (currentProgress >= 100) {
        clearInterval(progressTimer.current);
      } else {
        setProgress(currentProgress);
      }
    }, PROGRESS_INTERVAL);
  };

  const endCaptainPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      clearInterval(progressTimer.current);
      setPressing(false);
      setProgress(0);
    }
  };

  const handleCaptainClick = () => {
    if (!pressing && !wasLongPress.current) {
      onCaptainHelperClick();
    }
    wasLongPress.current = false;
  };

  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (pressFullscreenTimer.current) clearTimeout(pressFullscreenTimer.current);
      if (progressFullscreenTimer.current) clearInterval(progressFullscreenTimer.current);
    };
  }, []);

  return (
    <div className="status-bar">
      <div className="status-container">
        <div className="status-grid">
          <div
            className="status-blue"
            style={{ opacity: currentTeam === "blue" ? 1 : 0.4 }}
          >
            <div className="team-score">
              <span className="score-value">{remainingCards.blue}</span>
            </div>
            {teams?.blue && (
              <div className="team-info">
                {teams.blue.captain && <FiStar size={14} />}
                <FiUser size={14} />
                <span className="team-count">{teams.blue.players.length}</span>
              </div>
            )}
          </div>

          <div className="status-menu">
            <div className="menu-buttons">
              {isCaptainConfirmed && (
                <Button
                  variant="outline"
                  className={`menu-button captain-button ${
                    isCaptain ? "active" : ""
                  } ${highlightCaptainIcon ? "highlight" : ""}`}
                  onClick={handleCaptainClick}
                  onPointerDown={startCaptainPress}
                  onPointerUp={endCaptainPress}
                  onPointerLeave={endCaptainPress}
                  title={t('status.captainHelper')}
                >
                  <div className="button-content">
                    <FiStar size={24} />
                    {pressing && (
                      <div
                        className="press-progress"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </div>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onMenuClick}
                className={`menu-button ${highlightMenuIcon ? "highlight" : ""}`}
                title={t('status.menu')}
              >
                <FiMenu size={28} />
              </Button>
              <Button
                variant="outline"
                onClick={onChatClick}
                className="menu-button chat-button"
                title={t('status.chat')}
              >
                {isUserAuthorized ? (
                  <FiMessageCircle size={28} />
                ) : (
                  <FiUserPlus size={28} />
                )}
                {unreadCount > 0 && (
                  <span
                    className="unread-badge"
                    style={{
                      fontSize: unreadCount <= 9 ? '11px' : unreadCount <= 99 ? '9px' : '8px'
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
              {currentHint && onHintClick && (
                <Button
                  variant="outline"
                  onClick={onHintClick}
                  className={`menu-button hint-button hint-${hintTeam} ${isHintGlowing ? 'glowing' : ''}`}
                  title="Шифровка"
                >
                  <FiFileText />
                </Button>
              )}
              {!isFullscreenButtonHidden && (
                <Button
                  variant="outline"
                  onClick={handleFullscreenClick}
                  onPointerDown={startFullscreenPress}
                  onPointerUp={endFullscreenPress}
                  onPointerLeave={endFullscreenPress}
                  className={`menu-button captain-button ${isFullscreen ? "active" : ""}`}
                  title={t('status.fullscreen')}
                >
                  <div className="button-content">
                    <FiMaximize size={28} />
                    {pressingFullscreen && (
                      <div
                        className="press-progress"
                        style={{ width: `${progressFullscreen}%` }}
                      />
                    )}
                  </div>
                </Button>
              )}
            </div>
          </div>

          <div
            className="status-red"
            style={{ opacity: currentTeam === "red" ? 1 : 0.4 }}
          >
            <div className="team-score">
              <span className="score-value">{remainingCards.red}</span>
            </div>
            {teams?.red && (
              <div className="team-info">
                {teams.red.captain && <FiStar size={14} />}
                <FiUser size={14} />
                <span className="team-count">{teams.red.players.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(GameStatus);
