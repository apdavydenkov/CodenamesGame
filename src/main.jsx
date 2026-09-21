import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./contexts/LanguageContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import "./tailwind.css";
import "./styles/game.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <LanguageProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </LanguageProvider>
);
