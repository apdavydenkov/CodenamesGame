import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/dialogs.css";

const InfoDialog = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('info.title')}</DialogTitle>
          <div className="dialog-description">
            {t('info.description')}
            <br />
            <br />
            <strong>{t('info.features')}:</strong>
            <br />
            • {t('info.feature1')}
            <br />
            • {t('info.feature2')}
            <br />
            • {t('info.feature3')}
            <br />
            • {t('info.feature4')}
            <br />
            • {t('info.feature5')}
            <br />
            • {t('info.feature6')}
            <br />
            <br />
            <strong>{t('info.howToPlay')}:</strong>
            <br />
            1. {t('info.step1')}
            <br />
            2. {t('info.step2')}
            <br />
            3. {t('info.step3')}
            <br />
            4. {t('info.step4')}
            <br />
            <br />
            <strong>{t('info.aiGames')}:</strong>
            <br />
            {t('info.aiDescription')}
            <br />
            {t('info.aiWords')}
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InfoDialog;
