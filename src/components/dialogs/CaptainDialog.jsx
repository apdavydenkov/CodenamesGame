import { useState, useEffect, useRef, useCallback } from "react";
import { FiXCircle, FiChevronDown, FiHelpCircle, FiStar } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";
import { useNotify } from "../../contexts/NotificationContext";
import gameSocket from "../../services/socket";
import Dialog, { DialogBody, DialogFooter, BUTTON, BUTTON_PRIMARY, ICON_BUTTON, INPUT, PANEL } from "./Dialog";

const CONFIRMATION_PERIOD = 7 * 24 * 60 * 60 * 1000;

const TEAM_LIST = {
  blue: 'bg-[var(--blue-accent)]',
  red: 'bg-[var(--red-accent)]',
};

const WordsList = ({ team, title, words, remaining, collapsed, onToggle, drag, t }) => (
  <section className={`overflow-hidden rounded-xl ${TEAM_LIST[team]}`}>
    <button onClick={onToggle} className="flex w-full items-center justify-between bg-black/10 p-3 font-medium text-ui-panel cursor-pointer">
      <span className="flex items-center gap-2">
        {title}
        <FiChevronDown className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </span>
      <span>{t('captainDialog.remaining')}: {remaining}</span>
    </button>

    <div className={`overflow-hidden transition-all ${collapsed ? 'max-h-0 px-3 py-0' : 'max-h-[500px] p-3'}`}>
      <div className="flex flex-col gap-2">
        {words.map((item) => (
          <div
            key={item.word}
            draggable={!item.revealed}
            onDragStart={() => drag.start(team, item.word)}
            onDragEnter={() => drag.enter(team, item.word)}
            onDragEnd={drag.end}
            onDragOver={(event) => event.preventDefault()}
            className={`rounded-lg will-change-transform bg-ui-panel p-3 text-sm font-medium text-ui-on-panel ${
              item.revealed ? 'line-through opacity-60' : 'cursor-grab select-none'
            }`}
          >
            {item.word}
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CaptainDialog = ({ isOpen, onClose, onConfirm, gameState, myTeam, gameKey, userId, username, gameSettings = {} }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [phrase, setPhrase] = useState("");
  const [phraseError, setPhraseError] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [orders, setOrders] = useState({ blue: [], red: [] });
  const [hintWord, setHintWord] = useState("");
  const [hintNumber, setHintNumber] = useState("1");
  const dragged = useRef(null);

  // Капитан подтверждает роль фразой раз в неделю
  const [needsConfirmation, setNeedsConfirmation] = useState(() => {
    const lastConfirmed = localStorage.getItem('codenames-captain-confirmed');
    return !lastConfirmed || Date.now() - parseInt(lastConfirmed, 10) > CONFIRMATION_PERIOD;
  });

  const opponentTeam = myTeam === 'blue' ? 'red' : 'blue';

  const getTeamWords = useCallback((team) => {
    if (!gameState?.words) return [];

    const words = gameState.words
      .map((word, index) => ({ word, revealed: gameState.revealed[index], color: gameState.colors[index] }))
      .filter((item) => item.color === team);

    const order = orders[team];

    return [
      ...words.filter((item) => !item.revealed).sort((a, b) => order.indexOf(a.word) - order.indexOf(b.word)),
      ...words.filter((item) => item.revealed),
    ];
  }, [gameState, orders]);

  useEffect(() => {
    if (!gameState?.words) return;

    setOrders((prev) => {
      const next = { ...prev };

      for (const team of ['blue', 'red']) {
        const missing = gameState.words.filter(
          (word, index) => gameState.colors[index] === team && !next[team].includes(word)
        );
        if (missing.length) next[team] = [...next[team], ...missing];
      }

      return next;
    });
  }, [gameState]);

  const drag = {
    start: (team, word) => { dragged.current = { team, word }; },
    end: () => { dragged.current = null; },
    enter: (team, word) => {
      const source = dragged.current;
      if (!source || source.team !== team || source.word === word) return;

      setOrders((prev) => {
        const list = [...prev[team]];
        const from = list.indexOf(source.word);
        const to = list.indexOf(word);
        if (from === -1 || to === -1) return prev;

        list.splice(to, 0, ...list.splice(from, 1));
        return { ...prev, [team]: list };
      });
    },
  };

  const handleClose = () => {
    setPhrase("");
    onClose();
  };

  const handleConfirm = () => {
    if (phrase.trim() !== t('captainDialog.confirmationPhrase').toUpperCase()) {
      setPhraseError(true);
      return;
    }

    localStorage.setItem('codenames-captain-confirmed', Date.now().toString());
    setNeedsConfirmation(false);
    setPhrase("");
    setPhraseError(false);
    onConfirm();
  };

  const showHint = () => {
    const [before, after] = t('captainDialog.helperHint').split('{star}');
    notify(<>{before}<FiStar className="inline mx-0.5 mb-0.5" size={16} />{after}</>);
  };

  const handleGiveHint = () => {
    gameSocket.socket?.emit('GIVE_HINT', { gameKey, userId, username, word: hintWord, number: parseInt(hintNumber) });
    setHintWord("");
    setHintNumber("1");
  };

  if (needsConfirmation) {
    return (
      <Dialog isOpen={isOpen} title={t('captainDialog.title')} onClose={handleClose}>
        <DialogBody className="flex flex-col justify-center space-y-2 sm:space-y-4">
          <p className="text-sm opacity-80">{t('captainDialog.description')}</p>

          <label className="block text-sm font-medium">{t('captainDialog.enterPhrase')}</label>
          <p className={`${PANEL} text-center text-base font-semibold`}>{t('captainDialog.confirmationPhrase')}</p>
          <input
            type="text"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value.toUpperCase());
              setPhraseError(false);
            }}
            placeholder={t('captainDialog.phrasePlaceholder')}
            autoFocus
            className={`${INPUT} block w-full ${phraseError ? 'border-[var(--red-accent)]!' : ''}`}
          />
        </DialogBody>

        <DialogFooter className="flex gap-2 sm:gap-4">
          <button onClick={handleClose} className={`${BUTTON} flex-1`}>{t('captainDialog.cancel')}</button>
          <button onClick={handleConfirm} className={`${BUTTON_PRIMARY} flex-1`}>{t('captainDialog.confirm')}</button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={t('captainDialog.helperTitle')}
      onClose={onClose}
      panelClass="sm:h-auto sm:max-h-[calc(100vh-2rem)] max-w-2xl"
      actions={
        <button onClick={showHint} className={ICON_BUTTON} aria-label={t('menu.information')}>
          <FiHelpCircle size={20} />
        </button>
      }
    >
      <DialogBody className="space-y-2 sm:space-y-4">
        {gameSettings.advancedMode && !gameState?.currentHint && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1 text-sm font-medium">
              {t('hintDialog.giveHintLabel')}
              <button
                onClick={() => notify(t('hintDialog.giveHintHint'))}
                className="rounded-lg p-1 opacity-70 hover:opacity-100 hover:bg-ui-on-surface-hover transition-colors cursor-pointer"
                aria-label={t('hintDialog.giveHintLabel')}
              >
                <FiHelpCircle size={16} />
              </button>
            </h3>

            <div className="flex gap-2 sm:gap-4">
              <input
                type="text"
                value={hintWord}
                onChange={(e) => setHintWord(e.target.value)}
                placeholder={t('hintDialog.wordPlaceholder')}
                maxLength={20}
                className={`${INPUT} flex-1`}
              />
              <input
                type="number"
                value={hintNumber}
                onChange={(e) => setHintNumber(e.target.value)}
                min="0"
                max="9"
                placeholder={t('hintDialog.numberPlaceholder')}
                className={`${INPUT} w-20 text-center`}
              />
            </div>

            <button onClick={handleGiveHint} disabled={!hintWord.trim()} className={`${BUTTON_PRIMARY} w-full`}>
              {t('hintDialog.giveHintButton')}
            </button>

          </section>
        )}

        {gameState && (
          <>
            {[[myTeam, t('captainDialog.myWords')], [opponentTeam, t('captainDialog.opponentWords')]].map(([team, title]) => (
              <WordsList
                key={team}
                team={team}
                title={title}
                words={getTeamWords(team)}
                remaining={gameState.remainingCards[team]}
                collapsed={Boolean(collapsed[team])}
                onToggle={() => setCollapsed((prev) => ({ ...prev, [team]: !prev[team] }))}
                drag={drag}
                t={t}
              />
            ))}

            <section className="rounded-xl bg-[var(--assassin)] p-4 text-ui-panel">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FiXCircle size={16} />
                {t('captainDialog.assassinWord')}
              </h3>
              <p className="rounded-lg bg-white/10 px-4 py-3 text-center text-xl font-semibold">
                {gameState.words.find((_, index) => gameState.colors[index] === "black")}
              </p>
            </section>
          </>
        )}
      </DialogBody>

      <DialogFooter className="flex justify-end">
        <button onClick={handleClose} className={BUTTON}>{t('common.close')}</button>
      </DialogFooter>
    </Dialog>
  );
};

export default CaptainDialog;
