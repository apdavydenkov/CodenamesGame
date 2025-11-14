import { FiX, FiHelpCircle, FiBarChart2 } from "react-icons/fi";

/**
 * РЕФЕРЕНС МОДАЛЬНОГО ОКНА
 *
 * ⚠️ ВАЖНО: Использовать ТОЛЬКО Tailwind классы! БЕЗ кастомных стилей и inline-стилей!
 *           Если что-то невозможно сделать через Tailwind - спросить у пользователя.
 *
 * ИМЕНОВАНИЕ КЛАССОВ:
 *   Формат: {component-name}-header, {component-name}-content, {component-name}-footer
 *   Пример: reference-dialog-header, reference-dialog-content, reference-dialog-footer
 *
 * ⚠️ БЕЗ ВРАПОВ!
 *   НЕЛЬЗЯ добавлять промежуточные div'ы для группировки!
 *   Tailwind классы применяются НАПРЯМУЮ к структурным элементам.
 *   Плохо: <div class="header"><div class="flex">...</div></div>
 *   Хорошо: <div class="header flex">...</div>
 *
 * SPACING:
 *   px-3 sm:px-4          - горизонт. отступы (header/body/footer)
 *   space-y-2 sm:space-y-4  - между секциями
 *   space-y-1 sm:space-y-2  - внутри секций
 *   gap-2 sm:gap-4        - в grid/flex
 *   mt-2                  - от label до input
 *
 * ЦВЕТА:
 *   text-gray-900  - заголовки (h2/h3/h4/label)
 *   text-gray-600  - обычный текст (p)
 *   text-gray-500  - вспомогательный текст
 *   border-gray-200, bg-gray-50, bg-gray-100
 *   bg-gray-900 (первичная кнопка), bg-blue-600 (синяя), bg-red-600 (красная)
 *
 * ТИПОГРАФИКА:
 *   h2: text-base font-semibold text-gray-900
 *   h3: text-base font-medium text-gray-900
 *   h4/label: text-sm font-medium text-gray-900
 *   p: text-sm text-gray-600
 *
 * КНОПКИ:
 *   Первичная: rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800
 *   Вторичная: rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50
 *   Иконка: rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900
 */

const ReferenceDialog = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-2rem)] w-full max-w-2xl bg-white sm:rounded-lg">

        {/* HEADER */}
        <div className="reference-dialog-header flex items-center justify-between border-b border-gray-200 px-3 sm:px-4">
          <h2 className="text-base font-semibold text-gray-900">
            Референсное модальное окно
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Закрыть"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="reference-dialog-content flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 sm:space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">

            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base font-medium text-gray-900">
                Заголовок секции 1
              </h3>
              <p className="text-sm text-gray-600">
                Это пример текста в модальном окне. Tailwind CSS позволяет легко стилизовать компоненты без кастомных CSS файлов.
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base font-medium text-gray-900">
                Карточки
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1 sm:space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Карточка 1</h4>
                  <p className="text-sm text-gray-600">
                    Описание первой карточки
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1 sm:space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Карточка 2</h4>
                  <p className="text-sm text-gray-600">
                    Описание второй карточки
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base font-medium text-gray-900">
                Список элементов
              </h3>
              <ul className="space-y-1 sm:space-y-2">
                {Array.from({ length: 20 }, (_, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">
                        Элемент списка #{i + 1}
                      </span>
                      <span className="text-sm text-gray-500">
                        Детали
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base font-medium text-gray-900">
                Пример формы
              </h3>
              <div className="space-y-1 sm:space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Текстовое поле
                  </label>
                  <input
                    type="text"
                    placeholder="Введите текст..."
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Текстовая область
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Введите текст..."
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            </div>

        </div>

        {/* FOOTER */}
        <div className="reference-dialog-footer flex items-center justify-between border-t border-gray-200 px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Информация"
            >
              <FiHelpCircle size={20} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Статистика"
            >
              <FiBarChart2 size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-500">Online</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Сохранить
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReferenceDialog;
