import "../styles/components.css";

export const Label = ({ children, htmlFor, className = "" }) => {
  return (
    <label htmlFor={htmlFor} className={`label ${className}`.trim()}>
      {children}
    </label>
  );
};
