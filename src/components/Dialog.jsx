import "../styles/components.css";

export const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={() => onOpenChange(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ children, className = "" }) => (
  <div className={`dialog-content ${className}`.trim()}>{children}</div>
);

export const DialogHeader = ({ children }) => (
  <div className="dialog-header">{children}</div>
);

export const DialogFooter = ({ children, className = "" }) => (
  <div className={`dialog-footer ${className}`.trim()}>{children}</div>
);

export const DialogTitle = ({ children }) => (
  <h2 className="dialog-title">{children}</h2>
);

export const DialogDescription = ({ children }) => (
  <p className="dialog-description">{children}</p>
);
