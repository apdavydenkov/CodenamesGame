import { useTranslation } from "../hooks/useTranslation";
import "../styles/captain-helper.css";

const TeamSwitch = ({ showingMyTeam, onChange, myTeamColor }) => {
  const { t } = useTranslation();
  const opponentColor = myTeamColor === 'blue' ? 'red' : 'blue';
  const currentColor = showingMyTeam ? myTeamColor : opponentColor;

  return (
    <div className="team-switch-row">
      <span className="team-switch-label">
        {showingMyTeam ? t('captainDialog.myWords') : t('captainDialog.opponentWords')}
      </span>
      <label className="team-switch-container">
        <input
          type="checkbox"
          className="team-switch-input"
          checked={!showingMyTeam}
          onChange={(e) => onChange(!e.target.checked)}
        />
        <div className={`team-switch-slider ${currentColor}`}>
          <span className="team-switch-button"></span>
        </div>
      </label>
    </div>
  );
};

export default TeamSwitch;
