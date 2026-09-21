import { VscChromeClose } from "react-icons/vsc";

export const BUTTON = "rounded-lg border border-ui-accent/20 bg-ui-panel px-4 py-2 text-sm font-medium text-ui-on-panel hover:bg-ui-accent/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
export const BUTTON_PRIMARY = "rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-ui-panel hover:bg-ui-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
export const INPUT = "rounded-lg border border-ui-accent/20 bg-ui-panel px-4 py-2 text-sm text-ui-on-panel placeholder-ui-on-panel/40 focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent";
export const BUTTON_DANGER = "rounded-lg border border-[var(--red-accent)] bg-ui-panel px-4 py-2 text-sm font-medium text-[var(--red-accent)] hover:bg-[var(--red-accent)]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
export const ICON_BUTTON = "rounded-lg p-2 text-ui-on-surface-muted hover:bg-ui-on-surface-hover transition-colors cursor-pointer";
export const PANEL = "rounded-xl border border-ui-panel-line bg-ui-panel p-3 text-ui-on-panel transition-colors";

export const TAB = "relative -mb-[2px] border-b-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer";
export const TAB_ACTIVE = "border-ui-on-surface";
export const TAB_IDLE = "border-transparent opacity-60 hover:opacity-100";

const SCROLLBAR = "[scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-ui-accent/10 [&::-webkit-scrollbar-thumb]:bg-ui-accent/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-ui-accent/50";

export const DialogBody = ({ className = "", ...props }) => (
  <div className={`flex-1 overflow-y-auto px-3 sm:px-4 py-4 ${SCROLLBAR} ${className}`} {...props} />
);

export const DialogFooter = ({ className = "", children }) => (
  <div className={`flex-shrink-0 border-t border-ui-surface-line px-3 sm:px-4 py-2 ${className}`}>{children}</div>
);

const Dialog = ({ isOpen, title, onClose, panelClass = "sm:h-auto sm:max-h-[calc(100vh-2rem)] max-w-md", actions, team, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div data-team={team} className={`flex flex-col h-full w-full bg-ui-surface text-ui-on-surface sm:rounded-lg transition-colors ${panelClass}`}>

        <div className="flex-shrink-0 flex items-center justify-between border-b border-ui-surface-line px-3 sm:px-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="flex items-center gap-1">
            {actions}
            <button onClick={onClose} className={ICON_BUTTON} aria-label="Close">
              <VscChromeClose size={20} />
            </button>
          </div>
        </div>

        {children}

      </div>
    </div>
  );
};

export default Dialog;
