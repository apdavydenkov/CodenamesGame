import { useState, useEffect, useRef, memo } from "react";
import { Button } from "./Button";
import { FiMenu, FiMaximize, FiUserPlus, FiMessageCircle, FiStar } from "react-icons/fi";
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
}) => {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pressTimer = useRef(null);
  const progressTimer = useRef(null);
  const wasLongPress = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
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
              <Button
                variant="outline"
                onClick={toggleFullscreen}
                className={`menu-button ${isFullscreen ? "active" : ""}`}
                title={t('status.fullscreen')}
              >
                <FiMaximize size={28} />
              </Button>
            </div>
          </div>

          <div
            className="status-red"
            style={{ opacity: currentTeam === "red" ? 1 : 0.4 }}
          >
            <div className="team-score">
              <span className="score-value">{remainingCards.red}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(GameStatus);
