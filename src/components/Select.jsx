import "../styles/components.css";

export const Select = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  ...props
}) => {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`select ${className}`.trim()}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
