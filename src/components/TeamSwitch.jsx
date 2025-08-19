import React from "react";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/captain-helper.css";

const TeamSwitch = ({ team, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="team-switch-row">
      <span className="team-switch-label">{t('teamSwitch.myTeam')}</span>
      <label className="team-switch-container">
        <input
          type="checkbox"
          className="team-switch-input"
          checked={team === "red"}
          onChange={(e) => onChange(e.target.checked ? "red" : "blue")}
        />
        <div className={`team-switch-slider ${team}`}>
          <span className="team-switch-button"></span>
        </div>
      </label>
    </div>
  );
};

export default TeamSwitch;
