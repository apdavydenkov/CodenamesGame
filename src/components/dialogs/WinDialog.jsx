import { FiX } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";

const WinDialog = ({ isOpen, winner, onClose, onReturn }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

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

  // Цвет header в зависимости от победителя
  const headerColor = winner === "blue" ? 'bg-blue-600' :
                      winner === "red" ? 'bg-red-600' :
                      'bg-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-md bg-white sm:rounded-lg">

        {/* HEADER */}
        <div className={`win-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 ${headerColor}`}>
          <h2 className="text-base font-semibold text-white">
            {message.title}
          </h2>
          <button
            onClick={onReturn}
            className="rounded-lg p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="win-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {message.description}
            </p>
          </div>

        </div>

        {/* FOOTER */}
        <div className="win-dialog-footer border-t border-gray-200 px-3 sm:px-4 py-2">
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={onReturn}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
            >
              {t('winDialog.return')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-900 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 cursor-pointer"
            >
              {t('winDialog.newGame')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WinDialog;
