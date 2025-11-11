import "../styles/components.css";

export const Switch = ({ id, checked, onCheckedChange }) => {
  return (
    <div className="switch">
      <input
        type="checkbox"
        id={id}
        className="switch-input"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <label className="switch-label" htmlFor={id}>
        <span className="switch-button" />
      </label>
    </div>
  );
};
