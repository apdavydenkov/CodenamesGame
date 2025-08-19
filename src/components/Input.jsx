import React from "react";
import "../styles/components.css";

export const Input = ({
  value,
  onChange,
  placeholder,
  error,
  className = "",
  ...props
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${error ? "input-error" : ""} ${className}`.trim()}
      {...props}
    />
  );
};
