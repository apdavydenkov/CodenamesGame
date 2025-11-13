import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";
import { FiEye, FiXCircle, FiChevronDown, FiStar, FiX } from "react-icons/fi";
import TeamSwitch from "./TeamSwitch";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/dialogs.css";
import "../styles/captain-helper.css";

// Константа убрана - теперь используется перевод

const WordsList = ({
  title,
  words,
  remainingCount,
  isOpponent,
  onDragHandlers,
  expanded,
  onExpandToggle,
  t,
}) => (
  <div className={`words-list ${words[0]?.color}`}>
    <div
      className={`words-header${isOpponent ? " opponent-header" : ""}`}
      onClick={isOpponent ? onExpandToggle : undefined}
    >
      <span className="words-title">
        {title}
        {isOpponent && (
          <FiChevronDown
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s",
            }}
          />
        )}
      </span>
      <span className="words-count">{t('captainDialog.remaining')}: {remainingCount}</span>
    </div>
    <div
      className={`${isOpponent ? "opponent-content" : "words-content"} ${
        expanded ? "expanded" : ""
      }`}
    >
      <div className="word-items-container">
        {[false, true].map((isRevealed) => {
          const filteredWords = words.filter(
            (item) => item.revealed === isRevealed
          );
          if (!filteredWords.length) return null;

          return (
            <div
              key={isRevealed}
              className={`word-items-${isRevealed ? "revealed" : "unrevealed"}`}
            >
              {filteredWords.map((item) => (
                <div
                  key={item.word}
                  className={`word-item${
                    !isRevealed && !isOpponent ? " draggable" : ""
                  }${isRevealed ? " revealed" : ""}`}
                  {...(!isRevealed && !isOpponent
                    ? {
                        draggable: true,
                        onDragStart: (e) => onDragHandlers.start(e, item),
                        onDragEnter: (e) => onDragHandlers.enter(e, item),
                        onDragEnd: onDragHandlers.end,
                        onDragOver: (e) => e.preventDefault(),
                      }
                    : {})}
                >
                  {item.word}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const CaptainDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isCaptainConfirmed,
  gameState,
  myTeam,
}) => {
  const { t } = useTranslation();
  const [phrase, setPhrase] = useState("");
  const [phraseError, setPhraseError] = useState(false);
  const [showingMyTeam, setShowingMyTeam] = useState(true);
  const [isOpponentExpanded, setIsOpponentExpanded] = useState(true);
  const [unrevealedOrders, setUnrevealedOrders] = useState({
    blue: null,
    red: null,
  });
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Calculate which team to display based on myTeam and toggle
  const displayedTeam = showingMyTeam ? myTeam : (myTeam === 'blue' ? 'red' : 'blue');
  const opponentTeam = myTeam === 'blue' ? 'red' : 'blue';

  const getTeamWords = useCallback((team) => {
    if (!gameState?.words) return [];

    const words = gameState.words
      .map((word, index) => ({
        word,
        index,
        revealed: gameState.revealed[index],
        color: gameState.colors[index],
      }))
      .filter((item) => item.color === team);

    const [unrevealed, revealed] = [
      words.filter((item) => !item.revealed),
      words.filter((item) => item.revealed),
    ];

    if (unrevealedOrders[team]) {
      unrevealed.sort((a, b) => {
        const [indexA, indexB] = [a, b].map((item) =>
          unrevealedOrders[team].indexOf(item.word)
        );
        return indexA === -1 ? 1 : indexB === -1 ? -1 : indexA - indexB;
      });
    }

    return [...unrevealed, ...revealed];
  }, [gameState, unrevealedOrders]);

  const dragHandlers = {
    start: (e, item) => {
      if (item.revealed) {
        e.preventDefault();
        return;
      }
      dragItem.current = item;
      e.target.classList.add("dragging");
    },
    enter: (e, item) => {
      if (item.revealed) {
        e.preventDefault();
        return;
      }
      dragOverItem.current = item;
      e.preventDefault();
    },
    end: (e) => {
      e.target.classList.remove("dragging");
      if (!dragItem.current || !dragOverItem.current) return;

      const words = getTeamWords(displayedTeam);
      const unrevealed = words.filter((w) => !w.revealed);

      const [fromIndex, toIndex] = [dragItem.current, dragOverItem.current].map(
        (item) => unrevealed.findIndex((w) => w.word === item.word)
      );

      if (fromIndex !== -1 && toIndex !== -1) {
        const newUnrevealed = [...unrevealed];
        const [movedItem] = newUnrevealed.splice(fromIndex, 1);
        newUnrevealed.splice(toIndex, 0, movedItem);

        setUnrevealedOrders((prev) => ({
          ...prev,
          [displayedTeam]: newUnrevealed.map((w) => w.word),
        }));
      }

      dragItem.current = null;
      dragOverItem.current = null;
    },
  };

  useEffect(() => {
    if (gameState?.words) {
      setUnrevealedOrders((prev) => {
        const newOrders = { ...prev };
        ["blue", "red"].forEach((team) => {
          if (!newOrders[team]) {
            // Получаем слова команды напрямую без getTeamWords чтобы избежать бесконечного цикла
            const unrevealed = gameState.words
              .map((word, index) => ({
                word,
                revealed: gameState.revealed[index],
                color: gameState.colors[index],
              }))
              .filter((item) => item.color === team && !item.revealed)
              .map((item) => item.word);
            newOrders[team] = unrevealed;
          }
        });
        return newOrders;
      });
    }
  }, [gameState]);

  const handleClose = () => {
    setPhrase("");
    onClose();
  };

  const VerificationContent = (
    <>
      <DialogHeader>
        <DialogTitle>{t('captainDialog.title')}</DialogTitle>
        <DialogDescription>
          {t('captainDialog.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="captain-content">
        <div className="confirmation-container">
          <p className="confirmation-instruction">
            {t('captainDialog.enterPhrase')}
          </p>
          <div className="confirmation-wrapper">
            <div className="confirmation-phrase">{t('captainDialog.confirmationPhrase')}</div>
            <Input
              value={phrase}
              onChange={(e) => {
                setPhrase(e.target.value);
                setPhraseError(false);
              }}
              className={`confirmation-input ${phraseError ? 'error' : ''}`}
              placeholder={t('captainDialog.phrasePlaceholder')}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <div className="footer-buttons">
          <Button variant="outline" onClick={handleClose}>
            {t('captainDialog.cancel')}
          </Button>
          <Button
            onClick={() => {
              const normalizedPhrase = phrase.trim().toUpperCase();
              const expectedPhrase = t('captainDialog.confirmationPhrase').toUpperCase();

              if (normalizedPhrase === expectedPhrase) {
                onConfirm();
                setPhrase("");
                setPhraseError(false);
              } else {
                setPhraseError(true);
              }
            }}
          >
            {t('captainDialog.confirm')}
          </Button>
        </div>
      </DialogFooter>
    </>
  );

  const HelperContent = (
    <>
      <div className="dialog-header-with-close">
        <DialogTitle>{t('captainDialog.helperTitle')}</DialogTitle>
        <button className="close-button" onClick={onClose}>
          <FiX size={20} />
        </button>
      </div>

		<div className="helper-tip">
		  {t('captainDialog.helperTip')} {" "}
		  <span className="eye-icon">
			<FiStar size={16} />
		  </span>{" "}
		  {t('captainDialog.helperInstructions')}
		</div>

      <div className="captain-helper-content">
        <TeamSwitch
          showingMyTeam={showingMyTeam}
          onChange={setShowingMyTeam}
          myTeamColor={myTeam}
        />

        {gameState && (
          <>
            <WordsList
              title={showingMyTeam ? t('captainDialog.myWords') : t('captainDialog.opponentWords')}
              words={getTeamWords(displayedTeam)}
              remainingCount={gameState.remainingCards[displayedTeam]}
              onDragHandlers={dragHandlers}
              t={t}
            />

            <WordsList
              title={showingMyTeam ? t('captainDialog.opponentWords') : t('captainDialog.myWords')}
              words={getTeamWords(showingMyTeam ? opponentTeam : myTeam)}
              remainingCount={
                gameState.remainingCards[showingMyTeam ? opponentTeam : myTeam]
              }
              isOpponent
              expanded={isOpponentExpanded}
              onExpandToggle={() => setIsOpponentExpanded(!isOpponentExpanded)}
              t={t}
            />

            <div className="assassin-section">
              <div className="assassin-title">
                <FiXCircle />
                {t('captainDialog.assassinWord')}
              </div>
              <div className="assassin-word">
                {gameState.words.find(
                  (_, index) => gameState.colors[index] === "black"
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleClose} variant="outline">
          {t('common.close')}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`dialog-content captain-dialog ${
          isCaptainConfirmed ? "helper-mode" : ""
        }`}
      >
        {!isCaptainConfirmed ? VerificationContent : HelperContent}
      </DialogContent>
    </Dialog>
  );
};

export default CaptainDialog;
