import React, { useState, useEffect, useRef } from "react";
import { Button } from "./Button";
import { FiMenu, FiMaximize, FiEye } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";

const PRESS_DURATION = 1000;
const PROGRESS_INTERVAL = 50;

const GameStatus = ({
  remainingCards,
  onMenuClick,
  isCaptain,
  isCaptainConfirmed,
  onCaptainModeToggle,
  onCaptainHelperClick,
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
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
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
          <div className="status-blue">
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
                  }`}
                  onClick={handleCaptainClick}
                  onPointerDown={startCaptainPress}
                  onPointerUp={endCaptainPress}
                  onPointerLeave={endCaptainPress}
                  title={t('status.captainHelper')}
                >
                  <div className="button-content">
                    <FiEye size={24} />
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
                className="menu-button"
                title={t('status.menu')}
              >
                <FiMenu size={24} />
              </Button>
              <Button
                variant="outline"
                onClick={toggleFullscreen}
                className={`menu-button ${isFullscreen ? "active" : ""}`}
                title={t('status.fullscreen')}
              >
                <FiMaximize size={24} />
              </Button>
            </div>
          </div>

          <div className="status-red">
            <div className="team-score">
              <span className="score-value">{remainingCards.red}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatus;
