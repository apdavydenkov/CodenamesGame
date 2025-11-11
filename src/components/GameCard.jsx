import { useState, useEffect } from "react";
import Notification from "./Notification";
import { useTranslation } from "../hooks/useTranslation";
import { getBackNumber } from "../utils/cardBacks";
import "../styles/card-backs.css";

const PRESS_DURATION = 1500;
const PROGRESS_INTERVAL = 50;
const FLIP_DELAY = 2000;

const GameCard = ({ word, color, revealed, onConfirm, isCaptain, gameKey, position }) => {
  const { t } = useTranslation();
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
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
    const colorClass =
      revealed || isCaptain ? ` card-${color}` : " card-unrevealed";
    
    // Добавляем класс рубашки для нераскрытых карт
    let backClass = "";
	if (gameKey) {
	  const backNumber = getBackNumber(gameKey, position, color);
	  backClass = ` card-back-${color}-${backNumber}`;
	}
    
    return base + flip + colorClass + backClass;
  };

  const handleClick = () => {
    if (!revealed && !isCaptain && !pressing) {
      setShowNotification(true);
    }
  };

  const startPress = (e) => {
    if (isCaptain || revealed) return;
    e.preventDefault();
    setPressing(true);
    setProgress(0);

    const pressTimeout = setTimeout(() => {
      setPressing(false);
      setProgress(0);
      onConfirm();
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
        onClick={handleClick}
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
        message={t('notifications.pressAndHold')}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

export default GameCard;
