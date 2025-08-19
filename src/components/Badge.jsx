import React from "react";
import "../styles/components.css";

export const Badge = ({ children, onClick, active, className = "" }) => {
  return (
    <button
      className={`badge ${active ? "badge-active" : ""} ${className}`.trim()}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};
