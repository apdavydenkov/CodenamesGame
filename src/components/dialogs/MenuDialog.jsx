import { useState, useEffect } from "react";
import { FaTelegram, FaWhatsapp, FaVk, FaFacebook } from "react-icons/fa";
import { FiLink, FiHelpCircle, FiBarChart2, FiStar, FiX, FiMaximize } from "react-icons/fi";
import InfoDialog from "./InfoDialog";
import Notification from "../Notification";
import { useTranslation } from "../../hooks/useTranslation";

const MenuDialog = ({
  isOpen,
  onClose,
  isCaptain,
  onCaptainChange,
  onNewGame,
  onShowKey,
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
  teams = null,
  ownerId = null,
  userId = null,
  teamsLocked = false,
  isPrivate = false,
  canAccessGame = true,
  onJoinTeam,
  onBecomeCaptain,
  onLeaveCaptain,
  onLockTeams,
  onSetPrivate,
}) => {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const { t, language, setLanguage, availableLanguages, translations } = useTranslation();

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

      setNotificationMessage(message);
      setShowNotification(true);
      return;
    }

    // Android/Desktop - показываем уведомление про скрытие
    setNotificationMessage('Удерживайте кнопку чтобы скрыть её, если она вам мешает');
    setShowNotification(true);

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
          setNotificationMessage(t('notifications.linkCopied'));
          setShowNotification(true);
        } catch {
          // Clipboard API may fail
        }
        return;
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "noopener,noreferrer");
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
        <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-2xl bg-white sm:rounded-lg">

          {/* HEADER */}
          <div className="menu-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
            <h2 className="text-base font-semibold text-gray-900">
              {t('menu.title')}
            </h2>
            <button
              onClick={isGeneratingAI ? undefined : onClose}
              disabled={isGeneratingAI}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="menu-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

            {/* Team Selection Section */}
            {canAccessGame && isAuthenticated && (!teamsLocked || ownerId === userId || myTeam === 'blue' || myTeam === 'red') && (
              <div className="space-y-1 sm:space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  {t('menu.yourTeam')}:{' '}
                  {myTeam === 'blue' && t('menu.blueTeam')}
                  {myTeam === 'red' && t('menu.redTeam')}
                  {myTeam === 'spectator' && t('menu.spectator')}
                  {!myTeam && t('menu.notSelected')}
                  {myRole === 'captain' && (
                    <>
                      {' '}{t('menu.andCaptain')}
                      {' '}<FiStar size={14} className="inline-block align-middle ml-1" />
                    </>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
                  <button
                    onClick={() => onJoinTeam?.('blue', 'player')}
                    disabled={isGeneratingAI || (teamsLocked && ownerId !== userId)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      myTeam === 'blue' && myRole === 'player'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {t('menu.blueTeam')}
                  </button>
                  <button
                    onClick={() => onJoinTeam?.('red', 'player')}
                    disabled={isGeneratingAI || (teamsLocked && ownerId !== userId)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      myTeam === 'red' && myRole === 'player'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {t('menu.redTeam')}
                  </button>
                  <button
                    onClick={() => onJoinTeam?.('spectator', 'spectator')}
                    disabled={isGeneratingAI}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      myTeam === 'spectator'
                        ? 'bg-[#e4d6c5] text-gray-900 hover:bg-[#d9c9b5]'
                        : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {t('menu.spectator')}
                  </button>

                  {myTeam && myTeam !== 'spectator' && (
                    myRole === 'captain' ? (
                      <button
                        onClick={() => onLeaveCaptain?.()}
                        disabled={isGeneratingAI}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiStar size={14} className="inline-block align-middle mr-1" />
                        {t('menu.leaveCaptain')}
                      </button>
                    ) : (
                      teams?.[myTeam]?.captain === null && (
                        <button
                          onClick={() => onBecomeCaptain?.()}
                          disabled={isGeneratingAI}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FiStar size={14} className="inline-block align-middle mr-1" />
                          {t('menu.becomeCaptain')}
                        </button>
                      )
                    )
                  )}
                </div>

                {ownerId === userId && (
                  <>
                    <div className="space-y-1 sm:space-y-2">
                      <label className="block text-sm font-medium text-gray-900">
                        {t('menu.ownerActions')} {t('menu.teamsStatus')} {teamsLocked ? t('menu.teamsClosed') : t('menu.teamsOpen')}, {t('menu.gameStatus')} {isPrivate ? t('menu.gamePrivate') : t('menu.gamePublic')}
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <button
                        onClick={() => {
                          onLockTeams?.();
                          setNotificationMessage(
                            teamsLocked
                              ? t('notifications.teamsUnlocked')
                              : t('notifications.teamsLocked')
                          );
                          setShowNotification(true);
                        }}
                        disabled={isGeneratingAI}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {teamsLocked ? t('menu.unlockTeams') : t('menu.lockTeams')}
                      </button>
                      <button
                        onClick={() => {
                          onSetPrivate?.(!isPrivate);
                          setNotificationMessage(
                            isPrivate
                              ? t('notifications.gamePublic')
                              : t('notifications.gamePrivate')
                          );
                          setShowNotification(true);
                        }}
                        disabled={isGeneratingAI}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isPrivate ? t('menu.makePublic') : t('menu.makePrivate')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Dictionary Selection */}
            <div className="space-y-1 sm:space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                {t('menu.dictionary')}
              </label>
              <div className="relative">
                <select
                  value={currentDictionary?.id || ""}
                  onChange={handleDictionarySelect}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none cursor-pointer"
                >
                  {dictionaries.map((dic) => (
                    <option key={dic.id} value={dic.id}>
                      {dic.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* AI Topic Input */}
            {isAIDictionary && (
              <div className="space-y-1 sm:space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  {t('menu.aiTopic')}
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => onAITopicChange(e.target.value.slice(0, 100))}
                  placeholder={t('menu.aiTopicPlaceholder')}
                  maxLength={100}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <div className="text-xs text-gray-500 text-right">
                  {aiTopic.length}/100
                </div>
              </div>
            )}

            {/* Game Actions */}
            <div className="space-y-1 sm:space-y-2">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <button
                  onClick={onNewGame}
                  disabled={isGeneratingAI || (isAIDictionary && !aiTopic.trim())}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingAI ? t('menu.generating') : t('menu.newGame')}
                </button>
                <button
                  onClick={onShowKey}
                  disabled={isGeneratingAI}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('menu.gameKey')}
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-1 sm:space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                {t('languageDialog.selectLanguage')}
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={isGeneratingAI}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {translations[lang]?.language?.name || lang.toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Share Game */}
            <div className="space-y-1 sm:space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-900 text-center">
                  {t('menu.shareGame')}
                </label>
                <div className="flex gap-2 justify-center mt-2">
                  <button
                    onClick={() => handleShare("copy")}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent p-2 text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('share.copyLink')}
                  >
                    <FiLink size={20} />
                  </button>
                  <button
                    onClick={() => handleShare("telegram")}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent p-2 text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('share.telegram')}
                  >
                    <FaTelegram size={20} />
                  </button>
                  <button
                    onClick={() => handleShare("whatsapp")}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent p-2 text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('share.whatsapp')}
                  >
                    <FaWhatsapp size={20} />
                  </button>
                  <button
                    onClick={() => handleShare("vk")}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent p-2 text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('share.vk')}
                  >
                    <FaVk size={20} />
                  </button>
                  <button
                    onClick={() => handleShare("facebook")}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-transparent p-2 text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('share.facebook')}
                  >
                    <FaFacebook size={20} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <div className="menu-dialog-footer flex items-center justify-between border-t border-gray-200 px-3 sm:px-4 py-2">
            <div className="flex items-center">
              <button
                onClick={() => setShowInfoDialog(true)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                title={t('menu.information')}
              >
                <FiHelpCircle size={20} />
              </button>
              <button
                onClick={() => window.open('https://t.me/codenamesru_game', '_blank')}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                title="Telegram"
              >
                <FaTelegram size={20} />
              </button>
              <button
                onClick={() => window.open('https://server.code-names.ru', '_blank')}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                title="Statistics"
              >
                <FiBarChart2 size={20} />
              </button>
              <div className="flex items-center gap-1.5 ml-1">
                <div className={`h-2 w-2 rounded-full ${serverStatus ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-500">
                  {serverStatus ? t('menu.serverOnline') : t('menu.serverStarting')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className={`rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors flex items-center ${
                  isFullscreen ? "text-blue-600" : "text-gray-900"
                }`}
                title={t('status.fullscreen')}
              >
                <FiMaximize size={18} />
              </button>
              <button
                onClick={onClose}
                disabled={isGeneratingAI}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('menu.close')}
              </button>
            </div>
          </div>

        </div>
      </div>

      <InfoDialog
        isOpen={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
      />

      <Notification
        message={notificationMessage}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

export default MenuDialog;
