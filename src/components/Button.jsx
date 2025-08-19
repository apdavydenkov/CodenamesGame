import React from "react";
import "../styles/components.css";

export const Button = ({
  children,
  onClick,
  className = "",
  variant = "default",
  ...props
}) => {
  const buttonClass = `button ${variant} ${className}`.trim();

  return (
    <button className={buttonClass} onClick={onClick} {...props}>
      {children}
    </button>
  );
};
