import { useState, useEffect, useRef, memo } from "react";
import { FiMenu, FiUserPlus, FiStar, FiFileText, FiUser, FiEye, FiMessageSquare } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";
import ReferenceDialog from "./dialogs/ReferenceDialog";

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
  currentHint = null,
  hintTeam = null,
  onHintClick,
  teams = null,
}) => {
  const { t } = useTranslation();
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pressTimer = useRef(null);
  const progressTimer = useRef(null);
  const wasLongPress = useRef(false);

  const [isHintGlowing, setIsHintGlowing] = useState(false);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);

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
    <div className="bg-white w-full flex-shrink-0 select-none mt-1.5 portrait:bg-transparent portrait:relative portrait:z-[2]">
      <div className="w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 w-full">
          {/* Blue Team */}
          <div
            className="h-10 flex items-center justify-between rounded-md bg-blue-600 px-1"
            style={{ opacity: currentTeam === "blue" ? 1 : 0.4 }}
          >
            <div className="flex items-center justify-center text-white min-w-[2rem]">
              <span className="text-2xl font-bold">{remainingCards.blue}</span>
            </div>
            {teams?.blue && (
              <div className="flex flex-col items-center justify-center gap-0.5 text-white text-xs bg-blue-700 rounded h-[calc(100%-0.5rem)] px-1.5 min-w-[2.5rem]">
                {teams.blue.captain ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      <FiStar size={12} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <FiUser size={12} />
                      <span className="font-semibold leading-none">{teams.blue.players.length}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <FiUser size={12} />
                    <span className="font-semibold leading-none">{teams.blue.players.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Buttons */}
          <div className="flex items-center justify-center">
            <div className="flex gap-1">
              {isCaptainConfirmed && (
                <button
                  className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent w-10 h-10 min-w-[40px] text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent] ${
                    isCaptain ? "bg-gray-100 text-blue-600" : ""
                  } ${highlightCaptainIcon ? "[animation:buttonHighlight_3s_ease-in-out]" : ""}`}
                  onClick={handleCaptainClick}
                  onPointerDown={startCaptainPress}
                  onPointerUp={endCaptainPress}
                  onPointerLeave={endCaptainPress}
                  title={t('status.captainHelper')}
                >
                  <div className="relative w-full h-full flex items-center justify-center">
                    <FiStar size={20} />
                    {pressing && (
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </div>
                </button>
              )}
              <button
                className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent w-10 h-10 min-w-[40px] text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent] ${
                  highlightMenuIcon ? "[animation:buttonHighlight_3s_ease-in-out]" : ""
                }`}
                onClick={onMenuClick}
                title={t('status.menu')}
              >
                <FiMenu size={20} />
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent w-10 h-10 min-w-[40px] text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent] relative"
                onClick={onChatClick}
                title={t('status.chat')}
              >
                {isUserAuthorized ? (
                  <FiMessageSquare size={20} />
                ) : (
                  <FiUserPlus size={20} />
                )}
                {unreadCount > 0 && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-black font-bold pointer-events-none"
                    style={{
                      fontSize: '10px'
                    }}
                  >
                    {unreadCount > 99 ? 99 : unreadCount}
                  </span>
                )}
              </button>
              {currentHint && onHintClick && (
                <button
                  className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent w-10 h-10 min-w-[40px] text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent] hint-button hint-${hintTeam} ${
                    isHintGlowing ? 'glowing' : ''
                  }`}
                  onClick={onHintClick}
                  title="Шифровка"
                >
                  <FiFileText size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Red Team */}
          <div
            className="h-10 flex items-center justify-between rounded-md bg-red-600 px-1"
            style={{ opacity: currentTeam === "red" ? 1 : 0.4 }}
          >
            {teams?.red && (
              <div className="flex flex-col items-center justify-center gap-0.5 text-white text-xs bg-red-700 rounded h-[calc(100%-0.5rem)] px-1.5 min-w-[2.5rem]">
                {teams.red.captain ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      <FiStar size={12} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <FiUser size={12} />
                      <span className="font-semibold leading-none">{teams.red.players.length}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <FiUser size={12} />
                    <span className="font-semibold leading-none">{teams.red.players.length}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-center text-white min-w-[2rem]">
              <span className="text-2xl font-bold">{remainingCards.red}</span>
            </div>
          </div>
        </div>
      </div>

      <ReferenceDialog
        isOpen={showReferenceDialog}
        onClose={() => setShowReferenceDialog(false)}
      />

      <style>{`
        @keyframes buttonHighlight {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
          10%, 30%, 50%, 70%, 90% {
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.4);
            background-color: rgba(37, 99, 235, 0.1);
          }
          20%, 40%, 60%, 80% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default memo(GameStatus);
