import { useState, useEffect, useRef, useCallback } from "react";
import { FiXCircle, FiChevronDown, FiStar, FiX } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";
import gameSocket from "../../services/socket";

// WordsList component
const WordsList = ({
  title,
  words,
  remainingCount,
  isOpponent,
  onDragHandlers,
  expanded,
  onExpandToggle,
  t,
}) => {
  const teamColor = words[0]?.color;

  return (
    <div className={`rounded-md overflow-hidden mt-4 ${
      teamColor === 'blue' ? 'bg-blue-400 border border-blue-500' : 'bg-red-400 border border-red-500'
    }`}>
      <div
        className={`flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm cursor-pointer ${
          isOpponent ? '' : ''
        }`}
        onClick={isOpponent ? onExpandToggle : undefined}
      >
        <span className="flex items-center gap-2 text-white font-medium">
          {title}
          {isOpponent && (
            <FiChevronDown
              className={`transition-transform ${expanded ? "rotate-180" : "rotate-0"}`}
            />
          )}
        </span>
        <span className="text-white font-medium">{t('captainDialog.remaining')}: {remainingCount}</span>
      </div>

      <div
        className={`transition-all ${
          isOpponent
            ? expanded ? 'max-h-[500px] p-3' : 'max-h-0 px-3 py-0'
            : 'p-3'
        } overflow-hidden`}
      >
        <div className="flex flex-col gap-2">
          {[false, true].map((isRevealed) => {
            const filteredWords = words.filter(
              (item) => item.revealed === isRevealed
            );
            if (!filteredWords.length) return null;

            return (
              <div key={isRevealed} className="flex flex-col gap-2">
                {isRevealed && filteredWords.length > 0 && (
                  <div className="h-px bg-white/20 my-2" />
                )}
                {filteredWords.map((item) => (
                  <div
                    key={item.word}
                    className={`p-3 rounded-md text-sm font-medium text-gray-800 ${
                      isRevealed
                        ? 'line-through opacity-60 bg-white/70'
                        : !isOpponent
                          ? 'bg-white/90 cursor-grab select-none hover:bg-white'
                          : 'bg-white/90'
                    }`}
                    {...(!isRevealed && !isOpponent
                      ? {
                          draggable: true,
                          onDragStart: (e) => {
                            onDragHandlers.start(e, item);
                            e.target.classList.add('opacity-50');
                          },
                          onDragEnter: (e) => onDragHandlers.enter(e, item),
                          onDragEnd: (e) => {
                            onDragHandlers.end(e);
                            e.target.classList.remove('opacity-50');
                          },
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
};

const CaptainDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isCaptainConfirmed,
  gameState,
  myTeam,
  gameKey,
  userId,
  username,
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

  const [hintWord, setHintWord] = useState("");
  const [hintNumber, setHintNumber] = useState("1");

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

  const handleGiveHint = () => {
    if (!hintWord.trim()) return;
    if (!gameKey || !userId || !username) {
      console.error('[GIVE_HINT] Missing required data:', { gameKey, userId, username });
      return;
    }

    if (gameSocket.socket?.connected) {
      gameSocket.socket.emit('GIVE_HINT', {
        gameKey,
        userId,
        username,
        word: hintWord,
        number: parseInt(hintNumber)
      });
    } else {
      console.error('[GIVE_HINT] Socket not connected!');
    }

    setHintWord("");
    setHintNumber("1");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className={`flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full ${isCaptainConfirmed ? 'max-w-2xl' : 'max-w-md'} bg-white sm:rounded-lg`}>

        {!isCaptainConfirmed ? (
          <>
            {/* HEADER */}
            <div className="captain-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
              <h2 className="text-base font-semibold text-gray-900">
                {t('captainDialog.title')}
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="captain-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

              <p className="text-sm text-gray-600">
                {t('captainDialog.description')}
              </p>

              <div className="space-y-1 sm:space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  {t('captainDialog.enterPhrase')}
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="text-base font-semibold text-gray-900">
                    {t('captainDialog.confirmationPhrase')}
                  </p>
                </div>
                <input
                  type="text"
                  value={phrase}
                  onChange={(e) => {
                    setPhrase(e.target.value.toUpperCase());
                    setPhraseError(false);
                  }}
                  placeholder={t('captainDialog.phrasePlaceholder')}
                  autoFocus
                  className={`mt-2 block w-full rounded-lg border ${phraseError ? 'border-red-500' : 'border-gray-300'} bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900`}
                />
              </div>

            </div>

            {/* FOOTER */}
            <div className="captain-dialog-footer border-t border-gray-200 px-3 sm:px-4 py-2">
              <div className="flex gap-2 sm:gap-4">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {t('captainDialog.cancel')}
                </button>
                <button
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
                  className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  {t('captainDialog.confirm')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* HEADER */}
            <div className="captain-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
              <h2 className="text-base font-semibold text-gray-900">
                {t('captainDialog.helperTitle')}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="captain-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

              <div className="space-y-1 sm:space-y-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {t('captainDialog.helperTip')}{" "}
                  <span className="inline-flex items-center justify-center p-1 bg-white border border-blue-200 rounded-md mx-1 align-middle">
                    <FiStar size={14} />
                  </span>{" "}
                  {t('captainDialog.helperInstructions')}
                </div>
              </div>

              {!gameState?.currentHint && (
                <div className="space-y-1 sm:space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    {t('hintDialog.giveHintLabel')}
                  </label>

                  <div className="flex gap-2 sm:gap-4">
                    <input
                      type="text"
                      value={hintWord}
                      onChange={(e) => setHintWord(e.target.value.slice(0, 20))}
                      placeholder={t('hintDialog.wordPlaceholder')}
                      maxLength={20}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />

                    <input
                      type="number"
                      value={hintNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 9)) {
                          setHintNumber(val);
                        }
                      }}
                      min="0"
                      max="9"
                      placeholder={t('hintDialog.numberPlaceholder')}
                      className="w-20 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-center text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>

                  <button
                    onClick={handleGiveHint}
                    disabled={!hintWord.trim()}
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {t('hintDialog.giveHintButton')}
                  </button>

                  <p className="text-sm text-gray-500">
                    {t('hintDialog.numberHint')}
                  </p>
                </div>
              )}

              <div className="space-y-1 sm:space-y-2">
                <div className="flex gap-2 sm:gap-4 border-b-2 border-gray-200 -mb-[2px]">
                  <button
                    className={`relative px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-[2px] ${
                      showingMyTeam
                        ? myTeam === 'blue'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-red-600 border-red-600'
                        : 'text-gray-600 border-transparent hover:text-gray-900'
                    }`}
                    onClick={() => setShowingMyTeam(true)}
                  >
                    {t('captainDialog.myTeam')}
                  </button>
                  <button
                    className={`relative px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-[2px] ${
                      !showingMyTeam
                        ? myTeam === 'blue'
                          ? 'text-red-600 border-red-600'
                          : 'text-blue-600 border-blue-600'
                        : 'text-gray-600 border-transparent hover:text-gray-900'
                    }`}
                    onClick={() => setShowingMyTeam(false)}
                  >
                    {t('captainDialog.opponentTeam')}
                  </button>
                </div>
              </div>

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

                  <div className="space-y-1 sm:space-y-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                        <FiXCircle size={16} />
                        {t('captainDialog.assassinWord')}
                      </div>
                      <div className="rounded-lg bg-gray-800 px-4 py-3 text-center">
                        <span className="text-xl font-semibold text-white">
                          {gameState.words.find(
                            (_, index) => gameState.colors[index] === "black"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* FOOTER */}
            <div className="captain-dialog-footer flex items-center justify-end border-t border-gray-200 px-3 sm:px-4 py-2">
              <button
                onClick={handleClose}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CaptainDialog;
