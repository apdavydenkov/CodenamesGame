import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";
import { Switch } from "./Switch";
import { Label } from "./Label";
import { Input } from "./Input";
import { Select } from "./Select";
import { FaTelegram, FaWhatsapp, FaVk, FaFacebook } from "react-icons/fa";
import { FiLink, FiHelpCircle, FiBarChart2, FiStar } from "react-icons/fi";
import InfoDialog from "./InfoDialog";
import Notification from "./Notification";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/dialogs.css";

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
  // Новые пропсы для команд
  myTeam = null,
  myRole = null,
  isAuthenticated = false,
  teams = null,
  ownerId = null,
  userId = null,
  teamsLocked = false,
  isPrivate = false,
  onJoinTeam,
  onBecomeCaptain,
  onLeaveCaptain,
  onLockTeams,
  onSetPrivate,
}) => {
  const [showNotification, setShowNotification] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const { t } = useTranslation();

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

  const isAIDictionary = currentDictionary?.id === "ai_dictionary";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={isGeneratingAI ? () => {} : onClose}>
        <DialogContent>
          <DialogHeader className="dialog-header">
            <DialogTitle>{t('menu.title')}</DialogTitle>
          </DialogHeader>

          <div className="menu-content">
            {/* Показываем команды только если залогинен */}
            {isAuthenticated && (
              <>
                {/* Функциональный заголовок */}
                <label className="section-label">
                  {t('menu.yourTeam')}:{' '}
                  {myTeam === 'blue' && t('menu.blueTeam')}
                  {myTeam === 'red' && t('menu.redTeam')}
                  {myTeam === 'spectator' && t('menu.spectator')}
                  {!myTeam && t('menu.notSelected')}
                  {myRole === 'captain' && (
                    <>
                      {' '}{t('menu.andCaptain')}
                      {' '}<FiStar size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                    </>
                  )}
                </label>

                {/* Кнопки команд и капитана вместе */}
                <div className="team-buttons">
                  <Button
                    onClick={() => onJoinTeam?.('blue', 'player')}
                    variant={myTeam === 'blue' && myRole === 'player' ? 'default' : 'outline'}
                    disabled={isGeneratingAI || (teamsLocked && ownerId !== userId)}
                  >
                    {t('menu.blueTeam')}
                  </Button>
                  <Button
                    onClick={() => onJoinTeam?.('red', 'player')}
                    variant={myTeam === 'red' && myRole === 'player' ? 'default' : 'outline'}
                    disabled={isGeneratingAI || (teamsLocked && ownerId !== userId)}
                  >
                    {t('menu.redTeam')}
                  </Button>
                  <Button
                    onClick={() => onJoinTeam?.('spectator', 'spectator')}
                    variant={myTeam === 'spectator' ? 'default' : 'outline'}
                    disabled={isGeneratingAI}
                  >
                    {t('menu.spectator')}
                  </Button>

                  {/* Кнопка капитана прямо здесь */}
                  {myTeam && myTeam !== 'spectator' && (
                    myRole === 'captain' ? (
                      <Button
                        onClick={() => onLeaveCaptain?.()}
                        variant="outline"
                        disabled={isGeneratingAI}
                      >
                        <FiStar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {t('menu.leaveCaptain')}
                      </Button>
                    ) : (
                      teams?.[myTeam]?.captain === null && (
                        <Button
                          onClick={() => onBecomeCaptain?.()}
                          variant="outline"
                          disabled={isGeneratingAI}
                        >
                          <FiStar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {t('menu.becomeCaptain')}
                        </Button>
                      )
                    )
                  )}
                </div>

                {/* Действия владельца - без обёртки menu-item */}
                {ownerId === userId && (
                  <div className="owner-actions">
                    <label className="section-label">{t('menu.ownerActions')}</label>
                    <div className="owner-buttons">
                      <Button
                        onClick={() => onLockTeams?.()}
                        variant="outline"
                        disabled={isGeneratingAI}
                      >
                        {teamsLocked ? t('menu.unlockTeams') : t('menu.lockTeams')}
                      </Button>
                      <Button
                        onClick={() => onSetPrivate?.(!isPrivate)}
                        variant="outline"
                        disabled={isGeneratingAI}
                      >
                        {isPrivate ? t('menu.makePublic') : t('menu.makePrivate')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="dictionary-select-container">
              <label className="section-label">{t('menu.dictionary')}</label>
              <Select
                value={currentDictionary?.id || ""}
                onChange={handleDictionarySelect}
                options={dictionaries.map((dic) => ({
                  value: dic.id,
                  label: dic.title,
                }))}
                className="dictionary-select"
              />
            </div>

            {/* Поле ввода темы для ИИ-словаря */}
            {isAIDictionary && (
              <div className="ai-topic-container">
                <label className="section-label">{t('menu.aiTopic')}</label>
                <Input
                  value={aiTopic}
                  onChange={(e) => onAITopicChange(e.target.value.slice(0, 100))}
                  placeholder={t('menu.aiTopicPlaceholder')}
                  className="ai-topic-input"
                  maxLength={100}
                />
                <div className="ai-topic-counter">
                  {aiTopic.length}/100
                </div>
              </div>
            )}

            <div className="menu-actions">
              <Button 
                onClick={onNewGame} 
                disabled={isGeneratingAI || (isAIDictionary && !aiTopic.trim())}
              >
                {isGeneratingAI ? t('menu.generating') : t('menu.newGame')}
              </Button>
              <Button onClick={onShowKey} variant="outline" disabled={isGeneratingAI}>
                {t('menu.gameKey')}
              </Button>

              <div className="share-container">
                <label className="section-label">{t('menu.shareGame')}</label>
                <div className="share-icons">
                  <Button
                    onClick={() => handleShare("copy")}
                    variant="outline"
                    className="icon-button"
                    title={t('share.copyLink')}
                    disabled={isGeneratingAI}
                  >
                    <FiLink size={20} />
                  </Button>
                  <Button
                    onClick={() => handleShare("telegram")}
                    variant="outline"
                    className="icon-button"
                    title={t('share.telegram')}
                    disabled={isGeneratingAI}
                  >
                    <FaTelegram size={20} />
                  </Button>
                  <Button
                    onClick={() => handleShare("whatsapp")}
                    variant="outline"
                    className="icon-button"
                    title={t('share.whatsapp')}
                    disabled={isGeneratingAI}
                  >
                    <FaWhatsapp size={20} />
                  </Button>
                  <Button
                    onClick={() => handleShare("vk")}
                    variant="outline"
                    className="icon-button"
                    title={t('share.vk')}
                    disabled={isGeneratingAI}
                  >
                    <FaVk size={20} />
                  </Button>
                  <Button
                    onClick={() => handleShare("facebook")}
                    variant="outline"
                    className="icon-button"
                    title={t('share.facebook')}
                    disabled={isGeneratingAI}
                  >
                    <FaFacebook size={20} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="menu-footer">
              <div className="menu-footer-left">
                <button
                  onClick={() => setShowInfoDialog(true)}
                  title={t('menu.information')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <FiHelpCircle size={20} />
                </button>
                <button
                  onClick={() => window.open('https://t.me/codenamesru_game', '_blank')}
                  title="Telegram"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <FaTelegram size={20} />
                </button>
                <button
                  onClick={() => window.open('https://server.code-names.ru', '_blank')}
                  title="Statistics"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <FiBarChart2 size={20} />
                </button>
                <div
                  className="server-status"
                  title={serverStatus ? t('menu.serverOnline') : t('menu.serverStarting')}
                >
                  <div
                    className={`status-indicator ${
                      serverStatus ? "online" : "offline"
                    }`}
                  ></div>
                  <span className="status-text">
                    {serverStatus ? t('menu.serverOnline') : t('menu.serverStarting')}
                  </span>
                </div>
              </div>
              <Button onClick={onClose} variant="outline" disabled={isGeneratingAI}>
                {t('menu.close')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoDialog
        isOpen={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
      />

      <Notification
        message={t('notifications.linkCopied')}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};

export default MenuDialog;