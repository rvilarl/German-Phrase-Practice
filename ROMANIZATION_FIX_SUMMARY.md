# Исправление проблемы с транскрипцией (Romanization)

## Проблема

В приложении была проблема с несогласованным хранением транскрипции (romanization) для фраз:

1. **Транскрипция в скобках**: Фразы содержали транскрипцию прямо в тексте, например:
   - `"नमस्ते (namaste)"` вместо чистого текста `"नमस्ते"` с отдельным полем romanization
   - `"你好 (nǐ hǎo)"` вместо `"你好"` + romanization: `"nǐ hǎo"`

2. **Транскрипция в квадратных скобках**: Некоторые фразы использовали `[romanization]`

3. **Отсутствие транскрипции**: У некоторых фраз вообще не было транскрипции

## Решение

### 1. Обновление структуры данных

**Файл: `types.ts`**
- Добавлено поле `romanization?: string` в тип `ProposedCard`

```typescript
export type ProposedCard = {
  native: string;
  learning: string;
  romanization?: string;  // ← Новое поле
};
```

### 2. Обновление AI сервиса

**Файл: `services/geminiService.ts`**

Добавлена функция для определения языков, требующих транскрипцию:

```typescript
const requiresRomanization = (languageCode: LanguageCode): boolean => {
    return ['ar', 'hi', 'zh', 'ja'].includes(languageCode);
};
```

Обновлены все схемы для генерации карточек:
- `categoryAssistantResponseSchema()` - для Category Assistant
- `cardsFromTranscriptSchema()` - для транскриптов
- `imageCardsWithCategorySchema()` - для генерации из изображений
- `phraseSchema()` - для генерации по темам

Каждая схема теперь:
1. **Добавляет поле `romanization`** для языков, которым это нужно (китайский, японский, хинди, арабский)
2. **Явно указывает в описании**, что транскрипция НЕ должна быть в скобках в основном тексте
3. **Делает поле обязательным** для языков с нелатинским письмом

Пример изменений в схеме:

```typescript
properties: {
    [lang.learningCode]: {
        type: Type.STRING,
        description: `The phrase in ${lang.learning}. NEVER include romanization/transcription in parentheses here - use the separate romanization field.`
    },
    [lang.nativeCode]: {
        type: Type.STRING,
        description: `The ${lang.native} translation.`
    },
    ...(requiresRomanization(lang.learningCode) ? {
        romanization: {
            type: Type.STRING,
            description: `Romanization/transcription of the ${lang.learning} phrase. This field is REQUIRED.`
        }
    } : {})
},
required: [lang.learningCode, lang.nativeCode, ...(requiresRomanization(lang.learningCode) ? ['romanization'] : [])]
```

Обновлены все функции маппинга для извлечения `romanization` из ответа AI:
- `getCategoryAssistantResponse()`
- `generateCardsFromTranscript()`
- `generateCardsFromImage()`
- `generateTopicCards()`

### 3. Обновление функции создания карточек

**Файл: `App.tsx`**

Функция `addCardsToCategory` теперь правильно передает транскрипцию:

```typescript
const phrasesToAdd = cards.map(p => ({
  text: { native: p.native, learning: p.learning },
  category: targetCategory.id,
  ...(p.romanization ? { romanization: { learning: p.romanization } } : {})
}));
```

### 4. Скрипт для очистки существующих данных

**Файл: `scripts/cleanupPhraseRomanization.ts`**

Создан утилитарный скрипт, который:
1. Извлекает транскрипцию из текста фраз (если она в скобках или квадратных скобках)
2. Очищает текст фразы от транскрипции
3. Сохраняет транскрипцию в правильное поле `romanization.learning`

Функции:
- `extractRomanization(text)` - извлекает транскрипцию из текста
- `cleanupPhrase(phrase)` - обрабатывает одну фразу
- `cleanupAllPhrases(phrases)` - обрабатывает все фразы с отчетом
- `generateCleanupReport(result)` - генерирует отчет об изменениях
- `runCleanup()` - helper для запуска из консоли браузера

**Файл: `components/DataCleanupModal.tsx`**

Создан React компонент для выполнения очистки через UI с:
- Анализом существующих фраз
- Предпросмотром изменений
- Подтверждением перед применением
- Отображением статистики и примеров

## Как использовать

### Для новых фраз

Новые фразы, генерируемые AI, теперь автоматически будут иметь правильную структуру:
- Текст фразы будет чистым (без транскрипции в скобках)
- Транскрипция будет в отдельном поле `romanization.learning`

### Для существующих фраз

#### Вариант 1: Через UI (рекомендуется)

1. Добавьте `DataCleanupModal` в `App.tsx`:

```typescript
import DataCleanupModal from './components/DataCleanupModal';

// В компоненте App
const [isDataCleanupModalOpen, setIsDataCleanupModalOpen] = useState(false);

// В JSX перед закрывающим тегом
<DataCleanupModal
    isOpen={isDataCleanupModalOpen}
    onClose={() => setIsDataCleanupModalOpen(false)}
    allPhrases={allPhrases}
    onUpdatePhrases={async (phrases) => {
        for (const phrase of phrases) {
            await backendService.updatePhrase(phrase.id, phrase);
        }
        // Обновить состояние
        updateAndSavePhrases(prev => {
            const updated = new Map(phrases.map(p => [p.id, p]));
            return prev.map(p => updated.get(p.id) || p);
        });
    }}
/>
```

2. Добавьте кнопку для открытия модального окна в настройках или меню

3. Запустите очистку через UI

#### Вариант 2: Через консоль браузера

```javascript
// В консоли браузера
import { runCleanup } from './scripts/cleanupPhraseRomanization';
await runCleanup();
```

## Языки, требующие транскрипцию

Функция `requiresRomanization()` определяет следующие языки:
- **Арабский** (`ar`) - Arabic transliteration
- **Хинди** (`hi`) - Devanagari transliteration
- **Китайский** (`zh`) - Pinyin
- **Японский** (`ja`) - Romaji

Для этих языков:
- AI будет **обязательно** возвращать поле `romanization`
- Транскрипция НЕ будет включаться в текст фразы
- Схема данных требует наличие romanization

## Примеры изменений

### До очистки:
```json
{
  "text": {
    "learning": "नमस्ते (namaste)"
  }
}
```

### После очистки:
```json
{
  "text": {
    "learning": "नमस्ते"
  },
  "romanization": {
    "learning": "namaste"
  }
}
```

## Проверка результатов

После применения изменений:

1. **Новые фразы**: Создайте несколько новых фраз через Category Assistant или Smart Import и проверьте, что:
   - Текст фразы не содержит транскрипцию в скобках
   - Транскрипция находится в отдельном поле

2. **Существующие фразы**: Запустите скрипт очистки и проверьте отчет

3. **UI отображение**: Убедитесь, что фразы правильно отображаются в карточках

## Отладка

Если что-то пошло не так:

1. **Проверьте логи AI**: В консоли браузера смотрите ответы от Gemini API
2. **Проверьте схему**: Убедитесь, что `requiresRomanization()` возвращает `true` для вашего языка
3. **Проверьте промпт**: В `getCategoryAssistantResponse()` и других функциях проверьте, что правило о транскрипции добавлено

## Дополнительные улучшения (опционально)

1. **Валидация на бэкенде**: Добавить проверку, что для языков требующих транскрипцию, поле обязательно
2. **Миграция базы данных**: Создать миграцию для автоматической очистки при обновлении приложения
3. **Отображение в UI**: Обновить PhraseCard для всегда показа транскрипции под фразой (если есть)
4. **Настройка языков**: Добавить возможность настройки списка языков, требующих транскрипцию

## Резюме файлов изменений

✅ **Изменено:**
- `types.ts` - добавлено поле romanization в ProposedCard
- `services/geminiService.ts` - обновлены все схемы и функции генерации
- `App.tsx` - обновлена функция addCardsToCategory

✨ **Создано:**
- `scripts/cleanupPhraseRomanization.ts` - скрипт очистки данных
- `components/DataCleanupModal.tsx` - UI для очистки данных
- `ROMANIZATION_FIX_SUMMARY.md` - эта документация

## Тестирование

Рекомендуется протестировать:
1. ✅ Компиляция TypeScript - проверено
2. ⏳ Генерация новых фраз через Category Assistant
3. ⏳ Генерация фраз через Smart Import (транскрипты, изображения, темы)
4. ⏳ Очистка существующих фраз через UI
5. ⏳ Отображение фраз с транскрипцией в карточках

---

Автор: Claude Code
Дата: 2025-10-13
