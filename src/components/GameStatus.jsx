import { useState, useEffect, useRef, memo } from "react";
import { FiMenu, FiUserPlus, FiStar, FiFileText, FiUser, FiMessageSquare } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";

const PRESS_DURATION = 1000;
const PROGRESS_INTERVAL = 50;
const CONFIRMATION_PERIOD = 7 * 24 * 60 * 60 * 1000;
const HINT_GLOW = 30000;

const ICON_BUTTON = "inline-flex items-center justify-center overflow-hidden rounded-lg border border-ui-accent/20 bg-ui-panel w-10 h-10 min-w-[40px] text-ui-on-panel hover:bg-ui-panel-line cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent]";

const TEAM_BG = { blue: 'bg-[var(--blue-accent)]', red: 'bg-[var(--red-accent)]' };
const TEAM_BADGE = { blue: 'bg-[var(--blue-accent-hover)]', red: 'bg-[var(--red-accent-hover)]' };

const needsCaptainConfirmation = () => {
  const lastConfirmed = localStorage.getItem('codenames-captain-confirmed');
  return !lastConfirmed || Date.now() - parseInt(lastConfirmed, 10) > CONFIRMATION_PERIOD;
};

const TeamScore = ({ team, count, roster, advanced, active }) => (
  <div
    className={`h-10 flex items-center rounded-md px-1 ${TEAM_BG[team]} ${advanced ? 'justify-between' : 'justify-center'} ${
      team === 'red' ? 'flex-row-reverse' : ''
    } ${advanced && !active ? 'opacity-40' : ''}`}
  >
    <span className="min-w-[2rem] text-center text-2xl font-bold text-ui-panel">{count}</span>

    {advanced && roster && (
      <div className={`flex flex-col items-center justify-center gap-0.5 rounded px-1.5 h-[calc(100%-0.5rem)] min-w-[2.5rem] text-xs text-ui-panel ${TEAM_BADGE[team]}`}>
        {roster.captain && <FiStar size={12} />}
        <div className="flex items-center gap-0.5">
          <FiUser size={12} />
          <span className="font-semibold leading-none">{roster.players.length}</span>
        </div>
      </div>
    )}
  </div>
);

const GameStatus = ({
  remainingCards,
  onMenuClick,
  onChatClick,
  isCaptain,
  myRole,
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
  gameSettings = {},
  myTeam = null,
}) => {
  const { t } = useTranslation();
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hintGlowing, setHintGlowing] = useState(false);
  const pressTimer = useRef(null);
  const progressTimer = useRef(null);
  const wasLongPress = useRef(false);

  const advanced = Boolean(gameSettings.advancedMode);

  useEffect(() => {
    document.body.toggleAttribute('data-peeking', pressing);
  }, [pressing]);

  const hintTimestamp = currentHint?.timestamp;

  useEffect(() => {
    const remaining = hintTimestamp ? HINT_GLOW - (Date.now() - hintTimestamp) : 0;

    setHintGlowing(remaining > 0);
    if (remaining <= 0) return;

    const timer = setTimeout(() => setHintGlowing(false), remaining);
    return () => clearTimeout(timer);
  }, [hintTimestamp]);

  const stopPress = () => {
    clearTimeout(pressTimer.current);
    clearInterval(progressTimer.current);
    setPressing(false);
    setProgress(0);
  };

  useEffect(() => stopPress, []);

  const startCaptainPress = (event) => {
    event.preventDefault();
    wasLongPress.current = false;
    setPressing(true);
    setProgress(0);

    pressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      stopPress();

      if (needsCaptainConfirmation()) onCaptainHelperClick();
      else onCaptainModeToggle();
    }, PRESS_DURATION);

    let current = 0;
    progressTimer.current = setInterval(() => {
      current += (100 * PROGRESS_INTERVAL) / PRESS_DURATION;
      if (current >= 100) clearInterval(progressTimer.current);
      else setProgress(current);
    }, PROGRESS_INTERVAL);
  };

  const handleCaptainClick = () => {
    if (!pressing && !wasLongPress.current) onCaptainHelperClick();
    wasLongPress.current = false;
  };

  return (
    <div data-team={myTeam} className="w-full flex-shrink-0 select-none mt-1.5 portrait:relative portrait:z-[2]">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1 w-full">
        <TeamScore team="blue" count={remainingCards.blue} roster={teams?.blue} advanced={advanced} active={currentTeam === 'blue'} />

        <div className="flex items-center justify-center gap-1">
          {myRole === 'captain' && (
            <button
              className={`${ICON_BUTTON} relative ${isCaptain ? 'bg-ui-accent! text-ui-panel!' : ''}`}
              onClick={handleCaptainClick}
              onPointerDown={startCaptainPress}
              onPointerUp={stopPress}
              onPointerLeave={stopPress}
              title={t('status.captainHelper')}
            >
              <FiStar size={20} />
              {(pressing || highlightCaptainIcon) && (
                <div
                  className={`absolute inset-x-0 bottom-0 h-1 bg-ui-accent progress-fill ${pressing ? '' : 'progress-flash'}`}
                  style={{ '--fill': `${progress}%` }}
                />
              )}
            </button>
          )}

          <button
            className={`${ICON_BUTTON} ${highlightMenuIcon ? 'icon-flash-border' : ''}`}
            onClick={onMenuClick}
            title={t('status.menu')}
          >
            <FiMenu size={20} />
          </button>

          <button className={`${ICON_BUTTON} relative`} onClick={onChatClick} title={t('status.chat')}>
            {isUserAuthorized ? <FiMessageSquare size={20} /> : <FiUserPlus size={20} />}
            {unreadCount > 0 && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold pointer-events-none">
                {Math.min(unreadCount, 99)}
              </span>
            )}
          </button>

          {advanced && currentHint && onHintClick && (
            <button
              data-team={hintTeam}
              className={`${ICON_BUTTON} border-ui-accent! text-ui-accent! ${hintGlowing ? 'hint-glowing' : ''}`}
              onClick={onHintClick}
              title={t('status.hint')}
            >
              <FiFileText size={20} />
            </button>
          )}
        </div>

        <TeamScore team="red" count={remainingCards.red} roster={teams?.red} advanced={advanced} active={currentTeam === 'red'} />
      </div>
    </div>
  );
};

export default memo(GameStatus);
