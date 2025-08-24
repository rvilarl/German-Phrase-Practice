import type { Phrase, ChatMessage, DeepDiveAnalysis, ContentPart, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation, TranslationChatRequest, TranslationChatResponse, PhraseBuilderOptions, PhraseEvaluation } from '../types';
import { AiService } from './aiService';
import { getDeepseekApiKey } from './env';

const API_URL = "https://api.deepseek.com/chat/completions";
const model = "deepseek-chat";

const callDeepSeekApi = async (messages: any[], schema: object) => {
    const apiKey = getDeepseekApiKey();
    if (!apiKey) {
        throw new Error("DEEPSEEK_API_KEY environment variable not set for DeepSeek");
    }

    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
        }
    }

    if (lastUserMessageIndex !== -1) {
        messages[lastUserMessageIndex].content += `\n\nALWAYS respond with a valid JSON object matching this schema:\n${JSON.stringify(schema, null, 2)}`;
    } else {
        messages.push({ role: 'user', content: `Respond in JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`})
    }
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.7,
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("DeepSeek API Error:", errorBody);
        throw new Error(`DeepSeek API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
};

const generatePhrases: AiService['generatePhrases'] = async (prompt) => {
    const schema = {
        type: "array",
        items: {
            type: "object",
            properties: {
                german: { type: "string" },
                russian: { type: "string" },
            },
            required: ["german", "russian"],
        },
    };

    const messages = [
        { role: "system", content: "You are a helpful assistant that generates German phrases for language learners. Respond only in JSON format." },
        { role: "user", content: prompt }
    ];

    const responseSchema = { phrases: schema };
    const result = await callDeepSeekApi(messages, responseSchema);
    return result.phrases;
};

const generateSinglePhrase: AiService['generateSinglePhrase'] = async (russianPhrase) => {
    const schema = {
        type: "object",
        properties: {
            german: { type: "string" },
        },
        required: ["german"],
    };

    const prompt = `Translate the following Russian phrase into a common, natural-sounding German phrase: "${russianPhrase}". Return a single JSON object with one key: "german" for the translation.`;

    const messages = [
        { role: "system", content: "You are a helpful assistant that translates Russian phrases to German. Respond only in JSON format." },
        { role: "user", content: prompt }
    ];

    const parsedResult = await callDeepSeekApi(messages, schema);
    
    if (typeof parsedResult !== 'object' || parsedResult === null || !('german' in parsedResult) || typeof parsedResult.german !== 'string') {
        throw new Error("Received malformed translation data from DeepSeek API.");
    }
    
    return {
        german: parsedResult.german,
        russian: russianPhrase
    };
};

const translatePhrase: AiService['translatePhrase'] = async (russianPhrase) => {
    const schema = {
        type: "object",
        properties: { german: { type: "string" } },
        required: ["german"],
    };
    const prompt = `Translate this Russian phrase to German: "${russianPhrase}"`;
    const messages = [
        { role: "system", content: "You translate Russian to German. Respond only in JSON." },
        { role: "user", content: prompt }
    ];
    const result = await callDeepSeekApi(messages, schema);
    return { german: result.german };
};

const translateGermanToRussian: AiService['translateGermanToRussian'] = async (germanPhrase) => {
    const schema = {
        type: "object",
        properties: { russian: { type: "string" } },
        required: ["russian"],
    };
    const prompt = `Translate this German phrase to Russian: "${germanPhrase}"`;
    const messages = [
        { role: "system", content: "You translate German to Russian. Respond only in JSON." },
        { role: "user", content: prompt }
    ];
    const result = await callDeepSeekApi(messages, schema);
    return { russian: result.russian };
};


const improvePhrase: AiService['improvePhrase'] = async (originalRussian, currentGerman) => {
    const schema = {
        type: "object",
        properties: {
            suggestedGerman: { type: "string" },
            explanation: { type: "string" },
        },
        required: ["suggestedGerman", "explanation"],
    };

    const prompt = `Ты — эксперт по немецкому языку. Пользователь хочет выучить правильный и естественный немецкий.
Исходная фраза на русском: "${originalRussian}"
Текущий перевод на немецкий: "${currentGerman}"

Твоя задача: 
1. Проанализируй немецкий перевод на грамматическую правильность, естественность звучания и идиоматичность.
2. Если перевод можно улучшить, предложи лучший вариант.
3. Дай краткое и ясное объяснение на русском языке, почему твой вариант лучше.
4. Если текущий перевод уже идеален, верни его же в 'suggestedGerman' и объясни, почему он является наилучшим вариантом.`;

    const messages = [
        { role: "system", content: "You are a German language expert. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};


const generateInitialExamples: AiService['generateInitialExamples'] = async (phrase) => {
     const schema = {
        type: "object",
        properties: {
            examples: {
                type: "array",
                items: {
                    type: "object",
                    properties: { german: { type: "string" }, russian: { type: "string" } },
                    required: ["german", "russian"],
                },
            },
            proactiveSuggestions: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        contentParts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ['text', 'german'] },
                                    text: { type: "string" },
                                },
                                required: ["type", "text"],
                            },
                        },
                    },
                    required: ["title", "contentParts"],
                },
            },
            promptSuggestions: {
                type: "array",
                items: { type: "string" }
            }
        },
        required: ["examples", "proactiveSuggestions", "promptSuggestions"]
    };

    const prompt = `Пользователь изучает немецкую фразу: "${phrase.german}" (перевод: "${phrase.russian}"). 
1. Сгенерируй 3-5 разнообразных и практичных предложений-примеров на немецком, которые используют эту фразу. Для каждого примера предоставь русский перевод.
2. Проанализируй фразу и предложи 1-2 уникальных, полезных совета или альтернативы. Например, для "ich hätte gern" можно предложить "ich möchte". Сделай советы краткими и по делу. ВАЖНО: Разбей содержание каждого совета на массив 'contentParts'. Каждый элемент массива должно быть объектом с 'type' и 'text'. Если часть ответа - обычный текст, используй 'type': 'text'. Если это немецкое слово или фраза, используй 'type': 'german'.
3. Сгенерируй от 2 до 4 коротких, контекстно-зависимых вопросов для продолжения диалога на русском языке, которые пользователь может задать.
   - Предлагай "Покажи варианты с местоимениями" только если во фразе есть глагол для спряжения.
   - Предлагай "Как это использовать в вопросе?" только если фраза не является вопросом.
   - Всегда рассматривай общие полезные вопросы, такие как "Объясни грамматику" или "Предложи стратегию запоминания".`;

    const messages = [
        { role: "system", content: "You are an AI assistant for German language learners. Respond only in JSON format." },
        { role: "user", content: prompt }
    ];

    const parsedResponse = await callDeepSeekApi(messages, schema);

    return {
        role: 'model',
        text: 'Вот несколько примеров и советов, которые помогут вам лучше понять эту фразу:',
        examples: parsedResponse.examples || [],
        suggestions: parsedResponse.proactiveSuggestions || [],
        promptSuggestions: parsedResponse.promptSuggestions || [],
    };
};

const continueChat: AiService['continueChat'] = async (phrase, history, newMessage) => {
    const schema = {
        type: "object",
        properties: {
            responseParts: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ['text', 'german'] },
                        text: { type: "string" },
                    },
                    required: ["type", "text"],
                },
            },
            promptSuggestions: {
                type: "array",
                items: { type: "string" }
            }
        },
        required: ["responseParts", "promptSuggestions"]
    };

    const systemPrompt = `Ты AI-помощник для изучения немецкого языка. Пользователь изучает фразу "${phrase.german}" (${phrase.russian}).
1. Отвечай на вопросы пользователя. В своем ответе ОБЯЗАТЕЛЬНО используй предоставленную JSON-схему. Разбей свой ответ на массив 'responseParts'. Каждый элемент массива должен быть объектом с ключами 'type' и 'text'. Если часть ответа - это обычный текст на русском, используй 'type': 'text'. Если это немецкое слово или фраза, которую нужно озвучить, используй 'type': 'german'. Не используй Markdown в JSON. Сохраняй форматирование с помощью переносов строк (\\n) в текстовых блоках.
2. После ответа, сгенерируй от 2 до 4 новых, контекстно-зависимых вопросов для продолжения диалога в поле 'promptSuggestions'. Эти вопросы должны быть основаны на последнем сообщении пользователя и общем контексте диалога.
   - Предлагай "Покажи варианты с местоимениями" только если во фразе есть глагол для спряжения и это релевантно.
   - Предлагай "Как это использовать в вопросе?" только если фраза не является вопросом и это релевантно.
   - Предлагай новые, креативные вопросы, которые помогут пользователю глубже понять тему.`;
    
    const formattedHistory = history.map(msg => {
        let content = '';
        if (msg.role === 'user') {
            content = msg.text || '';
        } else { // model
            if (msg.contentParts) {
                content = msg.contentParts.map(p => p.text).join('');
            } else if (msg.text) {
                 content = msg.text;
            }
        }
        return { role: msg.role === 'model' ? 'assistant' : 'user', content };
    });

    const messages = [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        { role: "user", content: newMessage }
    ];

    const parsedResponse = await callDeepSeekApi(messages, schema);

    const contentParts: ContentPart[] = parsedResponse.responseParts && parsedResponse.responseParts.length > 0
        ? parsedResponse.responseParts
        : [{ type: 'text', text: 'Получен пустой ответ от AI.' }];

    return {
        role: 'model',
        contentParts,
        promptSuggestions: parsedResponse.promptSuggestions || [],
    };
};

const guideToTranslation: AiService['guideToTranslation'] = async (phrase, history, userAnswer) => {
    console.warn("guideToTranslation is not implemented for DeepSeek yet.");
    return Promise.resolve({
        role: 'model',
        contentParts: [{ type: 'text', text: 'This feature is currently better supported by the Gemini provider.' }],
        isCorrect: false,
        promptSuggestions: [],
    });
};

const discussTranslation: AiService['discussTranslation'] = async (request) => {
    // This is a complex prompt logic that would need careful adaptation for DeepSeek.
    // For now, returning a placeholder.
    console.warn("discussTranslation is not fully implemented for DeepSeek yet.");
    return Promise.resolve({
        role: 'model',
        contentParts: [{ type: 'text', text: 'This feature is currently better supported by the Gemini provider.' }],
        promptSuggestions: [],
    });
};

const generateDeepDiveAnalysis: AiService['generateDeepDiveAnalysis'] = async (phrase) => {
    const schema = {
        type: "object",
        properties: {
            chunks: {
                type: "array",
                items: {
                    type: "object",
                    properties: { text: { type: "string" }, type: { type: "string" }, explanation: { type: "string" } },
                    required: ["text", "type", "explanation"]
                }
            },
            keyConcepts: {
                type: "array",
                items: {
                    type: "object",
                    properties: { concept: { type: "string" }, explanation: { type: "string" } },
                    required: ["concept", "explanation"]
                }
            },
            personalizationQuestion: { type: "string" },
            mnemonicImage: {
                type: "object",
                properties: {
                    description: { type: "string" },
                    keywords: { type: "array", items: { type: "string" } }
                },
                required: ["description", "keywords"]
            }
        },
        required: ["chunks", "keyConcepts", "personalizationQuestion", "mnemonicImage"]
    };

    const prompt = `Ты — AI-ассистент, специализирующийся на когнитивных техниках запоминания. Пользователь изучает немецкую фразу: "${phrase.german}" (перевод: "${phrase.russian}").
Проведи глубокий когнитивный анализ этой фразы, следуя трём этапам.

**Этап 1: Деконструкция (Анализ)**
- **chunks**: Разбей немецкую фразу на грамматические чанки. Для каждого чанка укажи его тип (e.g., 'Noun', 'Verb') и объяснение на русском.
- **keyConcepts**: Выдели 1-3 ключевых семантических понятия и объясни их.

**Этап 2: Персонализация (Углубление)**
- **personalizationQuestion**: Сформулируй один наводящий вопрос на русском для активации эффекта самореференции.

**Этап 3: Кодирование (Мнемоника)**
- **mnemonicImage**: Создай яркий мнемонический образ или сцену.
  - **description**: Опиши сцену.
  - **keywords**: Укажи 2-4 ключевых слова.`;
    
    const messages = [
        { role: "system", content: "You are an AI assistant specializing in cognitive memory techniques. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};

const generateMovieExamples: AiService['generateMovieExamples'] = async (phrase) => {
    const schema = {
        type: "array",
        items: {
            type: "object",
            properties: {
                title: { type: "string", description: "Original movie title" },
                titleRussian: { type: "string", description: "Russian translation of the movie title" },
                dialogue: { type: "string", description: "Dialogue in German" },
                dialogueRussian: { type: "string", description: "Dialogue translation in Russian" },
            },
            required: ["title", "titleRussian", "dialogue", "dialogueRussian"],
        },
    };

    const prompt = `Найди до 5 примеров из диалогов популярных фильмов, где используется немецкая фраза "${phrase.german}". Фильмы могут быть как немецкого производства, так и популярные международные фильмы с качественным немецким дубляжом. Для каждого примера укажи:
1. Оригинальное название фильма ('title').
2. Название фильма на русском языке ('titleRussian').
3. Фрагмент диалога на немецком языке ('dialogue').
4. Перевод этого фрагмента на русский язык ('dialogueRussian').`;
    
    const messages = [
        { role: "system", content: "You are an AI assistant that finds movie dialogues. Respond only in JSON." },
        { role: "user", content: prompt }
    ];
    
    const responseSchema = { examples: schema };
    const result = await callDeepSeekApi(messages, responseSchema);
    return result.examples;
};

const analyzeWordInPhrase: AiService['analyzeWordInPhrase'] = async (phrase, word) => {
    const schema = {
        type: "object",
        properties: {
            word: { type: "string" },
            partOfSpeech: { type: "string" },
            translation: { type: "string" },
            nounDetails: {
                type: "object",
                properties: { article: { type: "string" }, plural: { type: "string" } },
            },
            verbDetails: {
                type: "object",
                properties: { infinitive: { type: "string" }, tense: { type: "string" }, person: { type: "string" } },
            },
            exampleSentence: { type: "string" },
            exampleSentenceTranslation: { type: "string" },
        },
        required: ["word", "partOfSpeech", "translation", "exampleSentence", "exampleSentenceTranslation"],
    };

     const prompt = `Проведи лингвистический анализ немецкого слова "${word}" в контексте фразы "${phrase.german}".
Верни JSON-объект со следующей информацией:
1.  **word**: анализируемое слово.
2.  **partOfSpeech**: часть речи на русском (например, "Существительное", "Глагол", "Прилагательное").
3.  **translation**: перевод слова на русский.
4.  **nounDetails**: если слово — существительное, укажи его артикль ('article') и форму множественного числа ('plural'). Если нет, пропусти это поле.
5.  **verbDetails**: если слово — глагол, укажи его инфинитив ('infinitive'), время ('tense') и лицо/число ('person'). Если нет, пропусти это поле.
6.  **exampleSentence**: новое предложение-пример на немецком, использующее это слово.
7.  **exampleSentenceTranslation**: перевод предложения-примера на русский.`;

    const messages = [
        { role: "system", content: "You are a linguistic AI assistant. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};

const conjugateVerb: AiService['conjugateVerb'] = async (infinitive) => {
    const schema = {
        type: "object",
        properties: {
            infinitive: { type: "string" },
            presentTense: {
                type: "object",
                properties: {
                    ich: { type: "string" },
                    du: { type: "string" },
                    er_sie_es: { type: "string" },
                    wir: { type: "string" },
                    ihr: { type: "string" },
                    sie_Sie: { type: "string" },
                },
                required: ["ich", "du", "er_sie_es", "wir", "ihr", "sie_Sie"],
            }
        },
        required: ["infinitive", "presentTense"],
    };

    const prompt = `Предоставь спряжение немецкого глагола "${infinitive}" в настоящем времени (Präsens). Верни JSON-объект, содержащий инфинитив и формы для 'ich', 'du', 'er_sie_es', 'wir', 'ihr', 'sie_Sie'.`;
    
    const messages = [
        { role: "system", content: "You are a linguistic AI assistant. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};

const declineNoun: AiService['declineNoun'] = async (noun, article) => {
    const schema = {
        type: "object",
        properties: {
            noun: { type: "string" },
            singular: {
                type: "object",
                properties: {
                    nominativ: { type: "string" },
                    akkusativ: { type: "string" },
                    dativ: { type: "string" },
                    genitiv: { type: "string" },
                },
                required: ["nominativ", "akkusativ", "dativ", "genitiv"],
            },
            plural: {
                type: "object",
                properties: {
                    nominativ: { type: "string" },
                    akkusativ: { type: "string" },
                    dativ: { type: "string" },
                    genitiv: { type: "string" },
                },
                required: ["nominativ", "akkusativ", "dativ", "genitiv"],
            },
        },
        required: ["noun", "singular", "plural"],
    };

    const prompt = `Предоставь склонение немецкого существительного "${noun}" с артиклем "${article}" по всем 4 падежам (Nominativ, Akkusativ, Dativ, Genitiv) для единственного (singular) и множественного (plural) числа. Включи определенный артикль в каждую форму. Верни JSON-объект.`;
    
    const messages = [
        { role: "system", content: "You are a linguistic AI assistant. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};

const generateSentenceContinuations: AiService['generateSentenceContinuations'] = async (russianPhrase) => {
    const schema = {
        type: "object",
        properties: {
            german: { type: "string" },
            continuations: {
                type: "array",
                items: { type: "string" }
            }
        },
        required: ["german", "continuations"]
    };

    const prompt = `Ты — AI-помощник для изучения языка, который помогает пользователю строить фразы по частям.
Текущая фраза пользователя на русском: "${russianPhrase}"

Твоя задача — проанализировать фразу и предложить логичные продолжения.

1.  **Анализ**: Определи, какая часть фразы не завершена. Это местоимение, объект, обстоятельство места, времени, способа действия?
    - Если фраза "Как мне добраться до...", то не хватает **обстоятельства места** (куда?).
    - Если фраза "Как мне добраться до вокзала", то можно добавить **обстоятельство способа действия** (как?) или **времени** (когда?).

2.  **Генерация**:
    - **german**: Переведи текущую фразу "${russianPhrase}" на немецкий язык. Убедись, что грамматика и знаки препинания корректны.
    - **continuations**: Сгенерируй от 7 до 10 разнообразных и логичных вариантов продолжения для русской фразы. Варианты должны быть релевантны для взрослого человека в реальных жизненных ситуациях (работа, семья, быт, друзья, путешествия).
        - **ВАЖНО**: Варианты должны **продолжать** мысль, а не **заменять** ее часть.
        - **ПРАВИЛЬНО**: для "Как мне добраться до вокзала", предложи способы: "на метро", "пешком", "быстрее всего".
        - **НЕПРАВИЛЬНО**: для "Как мне добраться до вокзала", предлагать "до аэропорта" или "до музея". Фраза уже содержит место назначения.
        - Варианты должны быть короткими, "чистыми" словами или фразами на русском без знаков препинания в начале.`;
    
    const messages = [
        { role: "system", content: "You are an AI assistant for German language learning that generates sentence continuations. Respond only in JSON." },
        { role: "user", content: prompt }
    ];
    
    return await callDeepSeekApi(messages, schema);
};

const findDuplicatePhrases: AiService['findDuplicatePhrases'] = async (phrases) => {
    console.warn("findDuplicatePhrases is not implemented for DeepSeek yet.");
    return Promise.resolve({ duplicateGroups: [] });
};

const generatePhraseBuilderOptions: AiService['generatePhraseBuilderOptions'] = async (phrase) => {
    const schema = {
        type: "object",
        properties: {
            words: {
                type: "array",
                items: { type: "string" }
            }
        },
        required: ["words"]
    };
    
    const prompt = `Для упражнения "собери фразу" по немецкому языку, подготовь набор слов.
Исходная фраза на русском: "${phrase.russian}"
Правильный перевод на немецком: "${phrase.german}"

Твоя задача:
1.  Включи в набор ВСЕ слова из правильного немецкого перевода. ВАЖНО: Сохраняй знаки препинания (точки, вопросительные знаки) как часть последнего слова. Например: "Hallo.", "geht's?".
2.  Добавь 5-7 "отвлекающих" слов (неверные формы, похожие слова).
3.  Перемешай все слова.
4.  Верни JSON-объект с ключом "words".`;

    const messages = [
        { role: "system", content: "You are a German teaching assistant. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};

const evaluatePhraseAttempt: AiService['evaluatePhraseAttempt'] = async (phrase, userAttempt) => {
    const schema = {
        type: "object",
        properties: {
            isCorrect: { type: "boolean" },
            feedback: { type: "string" },
            correctedPhrase: { type: "string" }
        },
        required: ["isCorrect", "feedback"]
    };
    
    const prompt = `Ты — опытный и доброжелательный преподаватель немецкого языка.
Ученик изучает фразу: "${phrase.russian}".
Правильный перевод: "${phrase.german}".
Ответ ученика: "${userAttempt}".

Твоя задача — дать обратную связь по ответу ученика.
1.  **Сравнение**: Сравнивай ответ ученика с правильным переводом, ИГНОРИРУЯ следующие незначительные расхождения:
    - **Регистр букв**: "Hallo" и "hallo" следует считать одинаковыми. Единственное исключение — существительные в немецком всегда пишутся с большой буквы. Если ученик написал существительное с маленькой, это ошибка.
    - **Знаки препинания в конце**: Отсутствие точки или вопросительного знака в конце не является ошибкой.
    - **Лишние пробелы** в начале или в конце.
2.  **Если ответ правильный (с учетом допущений выше)**: Установи \`isCorrect: true\`. Похвали ученика. Можно добавить короткий комментарий, почему именно эта формулировка хороша.
3.  **Если есть ошибки**: Установи \`isCorrect: false\`.
    - Мягко укажи на них.
    - Объясни, **почему** это ошибка (например, "Порядок слов здесь немного другой..." или "Существительное 'Tisch' мужского рода, поэтому нужен артикль 'der'").
    - Обязательно приведи правильный вариант в поле \`correctedPhrase\`.
4.  Твой тон должен быть позитивным, ободряющим и педагогичным.
5.  Отвечай на русском языке.`;

    const messages = [
        { role: "system", content: "You are an experienced and encouraging German language teacher. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};

const evaluateSpokenPhraseAttempt: AiService['evaluateSpokenPhraseAttempt'] = async (phrase, userAttempt) => {
    const schema = {
        type: "object",
        properties: {
            isCorrect: { type: "boolean" },
            feedback: { type: "string" },
            correctedPhrase: { type: "string" }
        },
        required: ["isCorrect", "feedback"]
    };
    
    const prompt = `Ты — опытный и доброжелательный преподаватель немецкого языка, оценивающий УСТНЫЙ ответ ученика.
Ученик изучает фразу: "${phrase.russian}".
Правильный письменный перевод: "${phrase.german}".
Устный ответ ученика (транскрипция): "${userAttempt}".

Твоя задача — дать обратную связь по устному ответу ученика.

**ОЧЕНЬ ВАЖНОЕ ПРАВИЛО ДЛЯ ОЦЕНКИ УСТНОЙ РЕЧИ:**
- Человек не может "произнести" заглавную букву. Поэтому ты ДОЛЖЕН быть снисходительным к капитализации.
- Если ЕДИНСТВЕННОЕ различие между ответом ученика и правильным вариантом — это отсутствие заглавной буквы у существительного (например, ученик сказал 'danke' вместо 'Danke'), ты ДОЛЖЕН считать ответ **ПРАВИЛЬНЫМ**.
- При этом в поле \`feedback\` ты можешь вежливо напомнить о правиле написания: "Отлично! Только помни, что на письме существительное 'Danke' пишется с большой буквы."

**Общие правила:**
1.  **Сравнение**: Сравнивай ответ ученика с правильным переводом, игнорируя знаки препинания в конце и лишние пробелы.
2.  **Если ответ правильный (учитывая правило о капитализации выше)**:
    - Установи \`isCorrect: true\`.
    - Дай позитивную и ободряющую обратную связь.
3.  **Если есть другие ошибки (кроме капитализации)**:
    - Установи \`isCorrect: false\`.
    - Мягко укажи на ошибку.
    - Объясни, **почему** это ошибка.
    - ОБЯЗАТЕЛЬНО приведи правильный вариант в поле \`correctedPhrase\`.
4.  Твой тон должен быть позитивным и педагогичным.
5.  Отвечай на русском языке.`;

    const messages = [
        { role: "system", content: "You are an experienced and encouraging German language teacher evaluating a spoken response. Respond only in JSON." },
        { role: "user", content: prompt }
    ];

    return await callDeepSeekApi(messages, schema);
};


const healthCheck: AiService['healthCheck'] = async () => {
    const apiKey = getDeepseekApiKey();
    if (!apiKey) {
        return false;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 2, // Ask for a small response
            })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => response.text());
            console.error("DeepSeek health check failed:", errorBody);
            return false;
        }
        return true;
    } catch (error) {
        const message = (error as any)?.message || 'Unknown error';
        console.error("DeepSeek health check failed:", message);
        return false;
    }
};


export const deepseekService: AiService = {
    generatePhrases,
    generateSinglePhrase,
    translatePhrase,
    translateGermanToRussian,
    improvePhrase,
    generateInitialExamples,
    continueChat,
    guideToTranslation,
    discussTranslation,
    generateDeepDiveAnalysis,
    generateMovieExamples,
    analyzeWordInPhrase,
    conjugateVerb,
    declineNoun,
    generateSentenceContinuations,
    findDuplicatePhrases,
    generatePhraseBuilderOptions,
    evaluatePhraseAttempt,
    evaluateSpokenPhraseAttempt,
    healthCheck,
    getProviderName: () => "DeepSeek",
};