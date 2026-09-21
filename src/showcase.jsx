import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MenuDialog from './components/dialogs/MenuDialog';
import ChatDialog from './components/dialogs/ChatDialog';
import InfoDialog from './components/dialogs/InfoDialog';
import WinDialog from './components/dialogs/WinDialog';
import HintDialog from './components/dialogs/HintDialog';
import AuthDialog from './components/dialogs/AuthDialog';
import SettingsDialog from './components/dialogs/SettingsDialog';
import CaptainDialog from './components/dialogs/CaptainDialog';

const WORDS = ['КОРАБЛЬ','ЛУНА','ЗАМОК','ПЕРО','ТЕНЬ','МОСТ','ЯКОРЬ','СВЕЧА','ГОРА','РЕКА','ЗЕРКАЛО','КЛЮЧ','ВОЛНА','ЛЕС','КАМЕНЬ'];
const COLORS = ['blue','blue','blue','red','red','red','black','neutral','blue','red','neutral','blue','red','neutral','neutral'];

const gameState = {
  words: WORDS,
  colors: COLORS,
  revealed: WORDS.map((_, i) => i === 2 || i === 5),
  remainingCards: { blue: 4, red: 3 },
  currentHint: null,
};

const messages = {
  global: [
    { id: '1', userId: 'other', author: 'Капитан', text: 'Всем привет, играем?', created: Date.now() - 3600000, team: 'blue', role: 'captain' },
    { id: '2', userId: 'me', author: 'Я', text: 'Готов, ключ скинул в чат игры', created: Date.now() - 1800000 },
    { id: '3', userId: 'other2', author: 'Гость', text: 'Смотрю со стороны', created: Date.now() - 900000, team: null },
    { id: '4', userId: 'other3', author: 'Соперник', text: 'Мы вас разнесём', created: Date.now() - 600000, team: 'red' },
  ],
  game: [],
};

const DIALOGS = {
  menu: (p) => <MenuDialog {...p} gameKey="БАКОСУГ" currentDictionary={{ id: 'official', name: 'Официальный словарь' }} dictionaries={[{ id: 'official', name: 'Официальный словарь' }]} gameSettings={{ advancedMode: true }} isAuthenticated userId="u1" ownerId="u1" myTeam="blue" myRole="captain" teamsLocked={false} isPrivate={false} canAccessGame serverStatus availableLanguages={['ru','en']} />,
  chat: (p) => <ChatDialog {...p} gameKey="БАКОСУГ" socket={{ emit() {} }} userId="me" username="Игрок" messages={messages} unreadCounts={{ game: 0, global: 2 }} onMarkRead={() => {}} onLoadOlder={() => {}} activeTab="global" onTabChange={() => {}} onLogout={() => {}} />,
  info: (p) => <InfoDialog {...p} />,
  win: (p) => <WinDialog {...p} winner="blue" onReturn={() => {}} />,
  hint: (p) => <HintDialog {...p} hint={{ word: 'ВОДА', number: 2, attempts: 1, timestamp: Date.now() }} team="blue" remainingCards={{ blue: 4, red: 3 }} canEndTurn onEndTurn={() => {}} />,
  auth: (p) => <AuthDialog {...p} onSuccess={() => {}} />,
  settings: (p) => <SettingsDialog {...p} userId="u1" username="Игрок" onLogout={() => {}} />,
  captain: (p) => <CaptainDialog {...p} gameState={gameState} myTeam="blue" gameKey="БАКОСУГ" userId="u1" username="Игрок" gameSettings={{ advancedMode: true }} onConfirm={() => {}} />,
};

const Showcase = () => {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('dialog') ?? 'menu';
  const team = params.get('team') ?? '';
  const [open] = useState(true);

  document.documentElement.dataset.team = team;
  if (params.get('captainConfirmed')) localStorage.setItem('codenames-captain-confirmed', Date.now().toString());
  else localStorage.removeItem('codenames-captain-confirmed');
  localStorage.setItem('codenames-pin', 'ABCD-1234-EFGH');

  return DIALOGS[name]({ isOpen: open, onClose: () => {} });
};

createRoot(document.getElementById('root')).render(
  <StrictMode><LanguageProvider><NotificationProvider><Showcase /></NotificationProvider></LanguageProvider></StrictMode>
);
