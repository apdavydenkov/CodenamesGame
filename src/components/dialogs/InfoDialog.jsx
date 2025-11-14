import { FiX } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";

const InfoDialog = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-md bg-white sm:rounded-lg">

        {/* HEADER */}
        <div className="info-dialog-header flex-shrink-0 flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
          <h2 className="text-base font-semibold text-gray-900">
            {t('info.title')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="info-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

          <p className="text-sm text-gray-600">
            {t('info.description')}
          </p>

          <div className="space-y-1 sm:space-y-2">
            <h3 className="text-base font-medium text-gray-900">
              {t('info.features')}:
            </h3>
            <ul className="space-y-1">
              <li className="text-sm text-gray-600">• {t('info.feature1')}</li>
              <li className="text-sm text-gray-600">• {t('info.feature2')}</li>
              <li className="text-sm text-gray-600">• {t('info.feature3')}</li>
              <li className="text-sm text-gray-600">• {t('info.feature4')}</li>
              <li className="text-sm text-gray-600">• {t('info.feature5')}</li>
              <li className="text-sm text-gray-600">• {t('info.feature6')}</li>
            </ul>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <h3 className="text-base font-medium text-gray-900">
              {t('info.howToPlay')}:
            </h3>
            <ol className="space-y-1">
              <li className="text-sm text-gray-600">1. {t('info.step1')}</li>
              <li className="text-sm text-gray-600">2. {t('info.step2')}</li>
              <li className="text-sm text-gray-600">3. {t('info.step3')}</li>
              <li className="text-sm text-gray-600">4. {t('info.step4')}</li>
            </ol>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <h3 className="text-base font-medium text-gray-900">
              {t('info.aiGames')}:
            </h3>
            <p className="text-sm text-gray-600">
              {t('info.aiDescription')}
            </p>
            <p className="text-sm text-gray-600">
              {t('info.aiWords')}
            </p>
          </div>

        </div>

        {/* FOOTER */}
        <div className="info-dialog-footer flex-shrink-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-2 sm:rounded-b-lg overflow-hidden">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InfoDialog;
