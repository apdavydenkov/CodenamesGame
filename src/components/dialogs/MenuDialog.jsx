import { useState, useEffect } from "react";
import { FaTelegram, FaWhatsapp, FaVk, FaFacebook } from "react-icons/fa";
import { FiLink, FiHelpCircle, FiBarChart2, FiStar, FiUser } from "react-icons/fi";
import { VscChromeMaximize, VscChromeRestore } from "react-icons/vsc";
import Dialog, { DialogBody, DialogFooter, BUTTON, BUTTON_PRIMARY, ICON_BUTTON, INPUT, PANEL } from "./Dialog";
import InfoDialog from "./InfoDialog";
import { useTranslation } from "../../hooks/useTranslation";
import { useNotify } from "../../contexts/NotificationContext";
import { isValidKeyFormat } from "../../utils/gameGenerator";
import { menuAccess } from "../../utils/menuAccess";

const TEAM_LABEL = { blue: 'menu.blueTeam', red: 'menu.redTeam' };

// Цвет места держится всегда: капитаны насыщенные, игроки бледные
const SEAT_COLOR = {
  'blue-captain': 'bg-[var(--blue-accent)] text-ui-panel hover:bg-[var(--blue-accent-hover)]',
  'red-captain': 'bg-[var(--red-accent)] text-ui-panel hover:bg-[var(--red-accent-hover)]',
  'blue-player': 'bg-[var(--blue-accent)]/10 text-[var(--blue-on-panel)] hover:bg-[var(--blue-accent)]/20',
  'red-player': 'bg-[var(--red-accent)]/10 text-[var(--red-on-panel)] hover:bg-[var(--red-accent)]/20',
};

const CAPTAIN_SEATS = [['blue', 'captain'], ['red', 'captain']];
const PLAYER_SEATS = [['blue', 'player'], ['red', 'player']];

const SEAT_ROWS = { simple: CAPTAIN_SEATS, full: [...CAPTAIN_SEATS, ...PLAYER_SEATS] };

const SHARE_BUTTON = 'inline-flex items-center justify-center rounded-lg border border-ui-accent/20 p-2 text-ui-accent hover:bg-ui-accent/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const Section = ({ title, step, children, className = '' }) => (
  <section className={`${PANEL} space-y-2 ${className}`}>
    {title && <h3 className={`text-sm transition-colors ${step ? 'menu-step font-bold' : 'font-medium'}`}>{title}</h3>}
    {children}
  </section>
);

const Toggle = ({ label, onHint, enabled, disabled, onChange }) => (
  <div className="space-y-1 sm:space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 text-sm font-medium transition-colors">
        {label}
        <button
          onClick={onHint}
          className="rounded-lg p-1 text-ui-accent hover:bg-ui-accent/10 transition-colors cursor-pointer"
          aria-label={label}
        >
          <FiHelpCircle size={16} />
        </button>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? 'bg-ui-accent' : 'bg-ui-accent/20'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-ui-panel transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  </div>
);

const MenuDialog = ({
  isOpen,
  onClose,
  onNewGame,
  onOpenKey,
  dictionaries,
  currentDictionary,
  onDictionaryChange,
  serverStatus = false,
  aiTopic = "",
  onAITopicChange,
  isGeneratingAI = false,
  myTeam = null,
  myRole = null,
  isAuthenticated = false,
  ownerId = null,
  userId = null,
  teamsLocked = false,
  isPrivate = false,
  canAccessGame = true,
  onJoinTeam,
  onLockTeams,
  onSetPrivate,
  gameSettings = {},
  onToggleAdvancedMode,
}) => {
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [gameKeyInput, setGameKeyInput] = useState('');
  const [languageOpen, setLanguageOpen] = useState(false);

  const { t, language, setLanguage, availableLanguages, translations } = useTranslation();
  const notify = useNotify();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
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
        </span>
      );

      notify(message);
      return;
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

  const handleShare = async (platform) => {
    const url = new URL(window.location);
    const shareText = encodeURIComponent(t('share.shareText'));
    const shareUrl = encodeURIComponent(url.toString());

    let shareLink = "";
    switch (platform) {
      case "telegram":
        shareLink = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
        break;
      case "whatsapp":
        shareLink = `https://wa.me/?text=${shareText}${shareUrl}`;
        break;
      case "vk":
        shareLink = `https://vk.com/share.php?url=${shareUrl}&title=${shareText}`;
        break;
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
        break;
      default:
        try {
          await navigator.clipboard.writeText(url.toString());
          notify(t('notifications.linkCopied'));
        } catch {
          // Clipboard API may fail
        }
        return;
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "noopener,noreferrer");
    }
  };

  const openKey = async (event) => {
    event.preventDefault();

    try {
      await onOpenKey(gameKeyInput);
    } catch (error) {
      notify(error.message);
    }
  };

  const handleDictionarySelect = (e) => {
    const dictionary = dictionaries.find((d) => d.id === e.target.value);
    if (dictionary) {
      onDictionaryChange(dictionary);
    }
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);

    const url = new URL(window.location);
    const params = url.searchParams.toString();

    if (newLanguage === 'ru') {
      url.pathname = '/';
    } else {
      url.pathname = `/${newLanguage}/`;
    }

    if (params) {
      url.search = `?${params}`;
    }

    window.history.pushState({}, '', url.toString());
  };

  const isAIDictionary = currentDictionary?.id === "ai_dictionary";
  const { advancedMode } = gameSettings;
  const seatRows = SEAT_ROWS[advancedMode ? 'full' : 'simple'];
  const { isOwner, showSeats } = menuAccess({ isAuthenticated, userId, ownerId, teamsLocked, myTeam, canAccessGame });

  if (!isOpen) return null;

  return (
    <>
      <Dialog
        isOpen={isOpen}
        title={t('menu.gameName')}
        onClose={isGeneratingAI ? undefined : onClose}
        panelClass="sm:h-auto sm:max-h-[calc(100vh-2rem)] max-w-2xl"
        team={myTeam === 'blue' || myTeam === 'red' ? myTeam : undefined}
        actions={
          <>
            <div className="relative">
              <button
                onClick={() => setLanguageOpen(!languageOpen)}
                disabled={isGeneratingAI}
                title={t('languageDialog.selectLanguage')}
                className={`${ICON_BUTTON} inline-flex h-9 min-w-9 items-center justify-center text-lg font-extralight leading-none disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {language.toUpperCase()}
              </button>

              {languageOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-ui-accent/20 bg-ui-panel py-1 text-ui-on-panel shadow-lg">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguageOpen(false);
                        handleLanguageChange(lang);
                      }}
                      className={`block w-full whitespace-nowrap px-4 py-2 text-left text-sm hover:bg-ui-accent/10 cursor-pointer ${
                        lang === language ? 'font-semibold' : 'opacity-70'
                      }`}
                    >
                      {translations[lang]?.language?.name || lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className={ICON_BUTTON}
              title={t('status.fullscreen')}
              aria-label={t('status.fullscreen')}
            >
              {isFullscreen ? <VscChromeRestore size={20} /> : <VscChromeMaximize size={20} />}
            </button>
          </>
        }
      >
        <DialogBody className="menu-steps flex flex-col space-y-2 sm:space-y-4">

            {isOwner && (
              <Section step title={t('menu.ownerActions')}>

                <Toggle
                  label={t('menu.advancedMode')}
                  onHint={() => notify(t('menu.advancedModeHint'))}
                  enabled={advancedMode}
                  disabled={isGeneratingAI}
                  onChange={() => onToggleAdvancedMode?.()}
                />

                <Toggle
                  label={t('menu.privateToggle')}
                  onHint={() => notify(t('menu.privateToggleHint'))}
                  enabled={isPrivate}
                  disabled={isGeneratingAI}
                  onChange={() => onSetPrivate?.(!isPrivate)}
                />

                {advancedMode && (
                  <Toggle
                    label={t('menu.teamsToggle')}
                    onHint={() => notify(t('menu.teamsToggleHint'))}
                    enabled={!teamsLocked}
                    disabled={isGeneratingAI}
                    onChange={() => onLockTeams?.()}
                  />
                )}
              </Section>
            )}

            {showSeats && (
              <Section step title={`${t('menu.yourTeam')}: ${t(TEAM_LABEL[myTeam] ?? 'menu.observer')}${myRole === 'captain' ? `, ${t('menu.andCaptain')}` : ''}`}>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {seatRows.map(([team, role]) => {
                    const active = myTeam === team && myRole === role;

                    return (
                      <button
                        key={`${team}-${role}`}
                        onClick={() => onJoinTeam?.(active ? 'spectator' : team, active ? 'spectator' : role)}
                        disabled={isGeneratingAI}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          SEAT_COLOR[`${team}-${role}`]
                        } ${active ? 'ring-2 ring-ui-accent ring-offset-2 ring-offset-ui-panel' : ''}`}
                      >
                        {role === 'captain' ? <FiStar size={14} /> : <FiUser size={14} />}
                        {t(role === 'captain' ? 'menu.roleCaptain' : 'menu.rolePlayer')}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section step title={t('menu.startGame')}>
              <div className="flex gap-2 sm:gap-4">
                <div className="relative flex-1 min-w-0">
                  <select
                    value={currentDictionary?.id || ""}
                    onChange={handleDictionarySelect}
                    className={`${INPUT} block w-full pr-10 appearance-none cursor-pointer`}
                  >
                    {dictionaries.map((dic) => (
                      <option key={dic.id} value={dic.id}>
                        {dic.title}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 opacity-60">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={onNewGame}
                  disabled={isGeneratingAI || (isAIDictionary && !aiTopic.trim())}
                  className={`${BUTTON_PRIMARY} w-28 flex-shrink-0`}
                >
                  {isGeneratingAI ? t('menu.generating') : t('menu.newGame')}
                </button>
              </div>

              {isAIDictionary && (
                <>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => onAITopicChange(e.target.value.slice(0, 100))}
                    placeholder={t('menu.aiTopicPlaceholder')}
                    maxLength={100}
                    className={`${INPUT} block w-full`}
                  />
                  <p className="text-xs opacity-60">{t('menu.aiTopic')}</p>
                </>
              )}

              <div className="flex items-center gap-3 py-1 text-xs text-ui-accent transition-colors">
                <span className="flex-1 border-t border-ui-accent/20" />
                {t('menu.joinRoom')}
                <span className="flex-1 border-t border-ui-accent/20" />
              </div>
              <form onSubmit={openKey} className="flex gap-2 sm:gap-4">
                <input
                  type="text"
                  value={gameKeyInput}
                  onChange={(event) => setGameKeyInput(event.target.value.toUpperCase().replace(/[^А-ЯЁ]/g, '').slice(0, 7))}
                  placeholder={t('keyDialog.keyPlaceholder')}
                  className={`${INPUT} flex-1 min-w-0`}
                />
                <button
                  type="submit"
                  disabled={isGeneratingAI || !isValidKeyFormat(gameKeyInput)}
                  className={`${BUTTON} w-28 flex-shrink-0`}
                >
                  {t('keyDialog.join')}
                </button>
              </form>
            </Section>

            <Section title={t('menu.shareGame')} className="mt-auto text-center">
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleShare("copy")}
                  disabled={isGeneratingAI}
                  className={SHARE_BUTTON}
                  title={t('share.copyLink')}
                >
                  <FiLink size={20} />
                </button>
                <button
                  onClick={() => handleShare("telegram")}
                  disabled={isGeneratingAI}
                  className={SHARE_BUTTON}
                  title={t('share.telegram')}
                >
                  <FaTelegram size={20} />
                </button>
                <button
                  onClick={() => handleShare("whatsapp")}
                  disabled={isGeneratingAI}
                  className={SHARE_BUTTON}
                  title={t('share.whatsapp')}
                >
                  <FaWhatsapp size={20} />
                </button>
                <button
                  onClick={() => handleShare("vk")}
                  disabled={isGeneratingAI}
                  className={SHARE_BUTTON}
                  title={t('share.vk')}
                >
                  <FaVk size={20} />
                </button>
                <button
                  onClick={() => handleShare("facebook")}
                  disabled={isGeneratingAI}
                  className={SHARE_BUTTON}
                  title={t('share.facebook')}
                >
                  <FaFacebook size={20} />
                </button>
              </div>
            </Section>
        </DialogBody>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setShowInfoDialog(true)}
              className={ICON_BUTTON}
              title={t('menu.information')}
            >
              <FiHelpCircle size={20} />
            </button>
            <button
              onClick={() => window.open('https://t.me/codenamesru_game', '_blank')}
              className={ICON_BUTTON}
              title="Telegram"
            >
              <FaTelegram size={20} />
            </button>
            <button
              onClick={() => window.open('https://server.code-names.ru', '_blank')}
              className={ICON_BUTTON}
              title="Statistics"
            >
              <FiBarChart2 size={20} />
            </button>
            <button
              onClick={() => notify(t(serverStatus ? 'menu.serverOnline' : 'menu.serverStarting'))}
              className={ICON_BUTTON}
              aria-label={t(serverStatus ? 'menu.serverOnline' : 'menu.serverStarting')}
            >
              <span className={`block h-2.5 w-2.5 rounded-full ${serverStatus ? 'bg-green-500' : 'bg-ui-on-surface-muted'}`} />
            </button>
          </div>
          <button onClick={onClose} disabled={isGeneratingAI} className={BUTTON}>
            {t('menu.close')}
          </button>
        </DialogFooter>
      </Dialog>

      <InfoDialog
        isOpen={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
      />
    </>
  );
};

export default MenuDialog;
