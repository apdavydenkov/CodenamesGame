import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/dialogs.css";

const WinDialog = ({ isOpen, winner, onClose, onReturn }) => {
  const { t } = useTranslation();
  const message =
    winner === "assassin"
      ? {
          title: t('winDialog.title'),
          description: t('winDialog.assassinLoss'),
        }
      : {
          title: t('winDialog.title'),
          description: `${
            winner === "blue" ? t('winDialog.blueTeam') : t('winDialog.redTeam')
          } ${t('winDialog.teamWon')}`,
        };

  return (
    <Dialog open={isOpen} onOpenChange={onReturn}>
      <DialogContent className="dialog-content win-dialog">
        <DialogHeader className="dialog-header">
          <DialogTitle>{message.title}</DialogTitle>
          <DialogDescription>{message.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="win-footer">
          <div className="footer-buttons">
            <Button variant="outline" onClick={onReturn}>
              {t('winDialog.return')}
            </Button>
            <Button onClick={onClose}>{t('winDialog.newGame')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WinDialog;
