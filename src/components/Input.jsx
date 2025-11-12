import { forwardRef } from "react";
import "../styles/components.css";

export const Input = forwardRef(({
  value,
  onChange,
  placeholder,
  error,
  className = "",
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${error ? "input-error" : ""} ${className}`.trim()}
      {...props}
    />
  );
});
