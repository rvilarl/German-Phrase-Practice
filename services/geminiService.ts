import { GoogleGenAI, Type } from "@google/genai";
import type { Phrase, ChatMessage, ExamplePair, ProactiveSuggestion, ContentPart, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation, TranslationChatRequest, TranslationChatResponse, PhraseBuilderOptions, PhraseEvaluation } from '../types';
import { AiService } from './aiService';
import { getGeminiApiKey } from './env';

let ai: GoogleGenAI | null = null;

const initializeApi = () => {
    if (ai) return ai;
    const apiKey = getGeminiApiKey();
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
        return ai;
    }
    return null;
}

const model = "gemini-2.5-flash";

const phraseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        german: {
          type: Type.STRING,
          description: 'The phrase in German.',
        },
        russian: {
          type: Type.STRING,
          description: 'The phrase in Russian.',
        },
      },
      required: ["german", "russian"],
    },
};

const generatePhrases: AiService['generatePhrases'] = async (prompt) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: phraseSchema,
                temperature: 0.7,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedPhrases = JSON.parse(jsonText);

        if (!Array.isArray(parsedPhrases)) {
            throw new Error("API did not return an array of phrases.");
        }

        const isValid = parsedPhrases.every(p => 
            typeof p === 'object' && p !== null &&
            'german' in p && 'russian' in p &&
            typeof p.german === 'string' && typeof p.russian === 'string'
        );

        if (!isValid) {
            throw new Error("Received malformed phrase data from API.");
        }
        return parsedPhrases;
    } catch (error) {
        console.error("Error generating phrases with Gemini:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
             throw new Error("Failed to parse the response from the AI. The format was invalid.");
        }
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const singlePhraseSchema = {
    type: Type.OBJECT,
    properties: {
      german: {
        type: Type.STRING,
        description: 'The translated phrase in German.',
      },
    },
    required: ["german"],
};

const generateSinglePhrase: AiService['generateSinglePhrase'] = async (russianPhrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Translate the following Russian phrase into a common, natural-sounding German phrase: "${russianPhrase}". Return a single JSON object with one key: "german" for the translation.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: singlePhraseSchema,
                temperature: 0.5,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);

        if (typeof parsedResult !== 'object' || parsedResult === null || !('german' in parsedResult) || typeof parsedResult.german !== 'string') {
             throw new Error("Received malformed translation data from API.");
        }
        
        return {
            german: parsedResult.german,
            russian: russianPhrase,
        };
    } catch (error) {
        console.error("Error generating single phrase with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const translatePhrase: AiService['translatePhrase'] = async (russianPhrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Translate this Russian phrase to German: "${russianPhrase}"`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: singlePhraseSchema,
                temperature: 0.2,
            },
        });
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);
        return { german: parsedResult.german };
    } catch (error) {
        console.error("Error translating phrase with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};

const russianSinglePhraseSchema = {
    type: Type.OBJECT,
    properties: {
      russian: {
        type: Type.STRING,
        description: 'The translated phrase in Russian.',
      },
    },
    required: ["russian"],
};

const translateGermanToRussian: AiService['translateGermanToRussian'] = async (germanPhrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Translate this German phrase to Russian: "${germanPhrase}"`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: russianSinglePhraseSchema,
                temperature: 0.2,
            },
        });
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);
        return { russian: parsedResult.russian };
    } catch (error) {
        console.error("Error translating German phrase with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};


const improvePhraseSchema = {
    type: Type.OBJECT,
    properties: {
      suggestedGerman: {
        type: Type.STRING,
        description: 'The improved, more natural, or grammatically correct German phrase.',
      },
      explanation: {
        type: Type.STRING,
        description: 'A concise explanation in Russian about why the suggestion is better, or why the original was already correct.',
      },
    },
    required: ["suggestedGerman", "explanation"],
};

const improvePhrase: AiService['improvePhrase'] = async (originalRussian, currentGerman) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Ты — эксперт по немецкому языку. Пользователь хочет выучить правильный и естественный немецкий.
Исходная фраза на русском: "${originalRussian}"
Текущий перевод на немецкий: "${currentGerman}"

Твоя задача: 
1. Проанализируй немецкий перевод на грамматическую правильность, естественность звучания и идиоматичность.
2. Если перевод можно улучшить, предложи лучший вариант. "Лучший" означает более правильный, более употребительный или более естественный для носителя языка.
3. Дай краткое и ясное объяснение на русском языке, почему твой вариант лучше. Например, "В данном контексте предлог 'auf' подходит лучше, чем 'in', потому что..." или "Эта формулировка более вежливая".
4. Если текущий перевод уже идеален, верни его же в 'suggestedGerman' и объясни, почему он является наилучшим вариантом.

Верни результат в виде JSON-объекта.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: improvePhraseSchema,
                temperature: 0.4,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error improving phrase with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};


const initialResponseSchema = {
    type: Type.OBJECT,
    properties: {
        examples: {
            type: Type.ARRAY,
            description: "List of 3-5 practical example sentences using the phrase.",
            items: {
                type: Type.OBJECT,
                properties: {
                    german: { type: Type.STRING, description: 'The example sentence in German.' },
                    russian: { type: Type.STRING, description: 'The Russian translation.' },
                },
                required: ["german", "russian"],
            },
        },
        proactiveSuggestions: {
            type: Type.ARRAY,
            description: "List of 1-2 proactive, unique suggestions for the user based on the phrase's context, like alternative phrasings or common related questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A short, engaging title for the suggestion." },
                    contentParts: {
                        type: Type.ARRAY,
                        description: "The suggestion content, broken into segments of plain text and German text.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ['text', 'german'], description: "Should be 'text' for plain Russian text or 'german' for a German word/phrase." },
                                text: { type: Type.STRING, description: "The segment of text. Do not use Markdown here." },
                            },
                            required: ["type", "text"]
                        }
                    }
                },
                required: ["title", "contentParts"]
            }
        },
        promptSuggestions: {
            type: Type.ARRAY,
            description: "A list of 2-4 short, context-aware follow-up questions in Russian that the user might ask. Only suggest pronoun variations if there's a verb. Only suggest asking a question if the phrase isn't one already.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["examples", "proactiveSuggestions", "promptSuggestions"]
};


const generateInitialExamples: AiService['generateInitialExamples'] = async (phrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Пользователь изучает немецкую фразу: "${phrase.german}" (перевод: "${phrase.russian}"). 
1. Сгенерируй 3-5 разнообразных и практичных предложений-примеров на немецком, которые используют эту фразу. Для каждого примера предоставь русский перевод.
2. Проанализируй фразу и предложи 1-2 уникальных, полезных совета или альтернативы. Например, для "ich hätte gern" можно предложить "ich möchte". Сделай советы краткими и по делу. ВАЖНО: Разбей содержание каждого совета на массив 'contentParts'. Каждый элемент массива должно быть объектом с 'type' и 'text'. Если часть ответа - обычный текст, используй 'type': 'text'. Если это немецкое слово или фраза, используй 'type': 'german'.
3. Сгенерируй от 2 до 4 коротких, контекстно-зависимых вопросов для продолжения диалога на русском языке, которые пользователь может задать.
   - Предлагай "Покажи варианты с местоимениями" только если во фразе есть глагол для спряжения.
   - Предлагай "Как это использовать в вопросе?" только если фраза не является вопросом.
   - Всегда рассматривай общие полезные вопросы, такие как "Объясни грамматику" или "Предложи стратегию запоминания".
Верни результат в виде JSON-объекта, соответствующего схеме.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: initialResponseSchema,
                temperature: 0.7,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        const examples: ExamplePair[] = parsedResponse.examples || [];
        const suggestions: ProactiveSuggestion[] = parsedResponse.proactiveSuggestions || [];
        const promptSuggestions: string[] = parsedResponse.promptSuggestions || [];

        return { 
            role: 'model', 
            text: 'Вот несколько примеров и советов, которые помогут вам лучше понять эту фразу:',
            examples,
            suggestions,
            promptSuggestions,
        };
    } catch (error) {
        console.error("Error generating initial examples with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
}

const chatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        responseParts: {
            type: Type.ARRAY,
            description: "The response broken down into segments of plain text and German text.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['text', 'german'], description: "Should be 'text' for plain Russian text or 'german' for a German word/phrase." },
                    text: { type: Type.STRING, description: "The segment of text. Do not use Markdown here." },
                },
                required: ["type", "text"],
            }
        },
        promptSuggestions: {
            type: Type.ARRAY,
            description: "A list of 2-4 new, context-aware follow-up questions in Russian that the user might ask next, based on the current conversation. Only suggest pronoun variations if there's a verb. Only suggest asking a question if the phrase isn't one already.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["responseParts", "promptSuggestions"]
};

const continueChat: AiService['continueChat'] = async (phrase, history, newMessage) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const formattedHistory = history.map(msg => {
        let fullText = '';
        if (msg.contentParts) {
            fullText = msg.contentParts.map(p => p.text).join('');
        } else if (msg.text) {
             fullText = msg.text;
             if (msg.examples && msg.examples.length > 0) {
                const examplesText = msg.examples.map(ex => `- ${ex.german} (${ex.russian})`).join('\n');
                fullText += '\n\nПримеры:\n' + examplesText;
            }
            if (msg.suggestions && msg.suggestions.length > 0) {
                const suggestionsText = msg.suggestions.map(s => `### ${s.title}\n${s.contentParts.map(p => p.text).join('')}`).join('\n\n');
                fullText += '\n\nСоветы:\n' + suggestionsText;
            }
        }
        return {
            role: msg.role,
            parts: [{ text: fullText }]
        };
    });
    
    const systemInstruction = `Ты AI-помощник для изучения немецкого языка. Пользователь изучает фразу "${phrase.german}" (${phrase.russian}).
1. Отвечай на вопросы пользователя. В своем ответе ОБЯЗАТЕЛЬНО используй предоставленную JSON-схему. Разбей свой ответ на массив 'responseParts'. Каждый элемент массива должен быть объектом с ключами 'type' и 'text'. Если часть ответа - это обычный текст на русском, используй 'type': 'text'. Если это немецкое слово или фраза, которую нужно озвучить, используй 'type': 'german'. Не используй Markdown в JSON. Сохраняй форматирование с помощью переносов строк (\\n) в текстовых блоках.
2. После ответа, сгенерируй от 2 до 4 новых, контекстно-зависимых вопросов для продолжения диалога в поле 'promptSuggestions'. Эти вопросы должны быть основаны на последнем сообщении пользователя и общем контексте диалога.
   - Предлагай "Покажи варианты с местоимениями" только если во фразе есть глагол для спряжения и это релевантно.
   - Предлагай "Как это использовать в вопросе?" только если фраза не является вопросом и это релевантно.
   - Предлагай новые, креативные вопросы, которые помогут пользователю глубже понять тему.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: [...formattedHistory, { role: 'user', parts: [{ text: newMessage }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: chatResponseSchema,
                temperature: 0.5,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        
        const contentParts: ContentPart[] = parsedResponse.responseParts && parsedResponse.responseParts.length > 0
            ? parsedResponse.responseParts
            : [{ type: 'text', text: 'Получен пустой ответ от AI.' }];
        
        const promptSuggestions: string[] = parsedResponse.promptSuggestions || [];

        return {
            role: 'model',
            contentParts,
            promptSuggestions,
        };

    } catch (error) {
        console.error("Error continuing chat with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const learningAssistantResponseSchema = {
    type: Type.OBJECT,
    properties: {
        ...chatResponseSchema.properties,
        isCorrect: {
            type: Type.BOOLEAN,
            description: "Set to true ONLY if the user's answer is a correct and complete translation of the target phrase."
        },
        wordOptions: {
            type: Type.ARRAY,
            description: "A list of 7-10 shuffled word choices (correct words and distractors) to help the user construct their next response. Should be an empty array if isCorrect is true.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["responseParts", "isCorrect", "promptSuggestions", "wordOptions"]
};

const guideToTranslation: AiService['guideToTranslation'] = async (phrase, history, userAnswer) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");
    
    const formattedHistory = history.map(msg => {
        const role = msg.role === 'user' ? 'user' : 'model';
        const text = msg.contentParts ? msg.contentParts.map(p => p.text).join('') : (msg.text || '');
        return { role, parts: [{ text }] };
    });

    const systemInstruction = `Ты — опытный преподаватель-методист немецкого языка. Твоя задача — провести пользователя через интерактивное упражнение, чтобы он понял и запомнил перевод фразы. Используй метод наводящих вопросов и подсказок.

Исходная фраза: "${phrase.russian}"
Правильный немецкий перевод: "${phrase.german}"

**Твой алгоритм действий:**

**Шаг 1: Анализ фразы (внутренний).**
- Это буквальный перевод или идиома/метафора?

**Шаг 2: Первая подсказка (первое сообщение пользователю).**
- **ЕСЛИ ЭТО ИДИОМА:**
    1. Начни с того, что это идиоматическое выражение и дословный перевод не подойдет.
    2. Дай концептуальную подсказку о немецком эквиваленте. Пример для "Взгляд с поволокой": "В немецком для этого есть образное слово, дословно 'взгляд из спальни'. Это одно составное существительное."
    3. Задай наводящий вопрос для первой части слова. Пример: "С какого слова, обозначающего комнату, оно может начинаться?"
    4. Сформируй \`wordOptions\` на основе этой подсказки (например, 'Schlafzimmer', 'Wohnzimmer', 'Küche', 'Blick').
- **ЕСЛИ ЭТО БУКВАЛЬНЫЙ ПЕРЕВОД:**
    1. Разбей фразу на логические части.
    2. Начни с ключевой части, задав наводящий вопрос. Пример для "Как мне добраться до вокзала?": "Начнем с вопроса. Какое слово мы используем, чтобы спросить 'как?'"
    3. Сформируй \`wordOptions\` с правильным словом и несколькими отвлекающими (например, 'Wie', 'Wo', 'Was').

**Шаг 3: Последующие шаги.**
- **Если пользователь ответил ПРАВИЛЬНО:**
    1. Похвали его ("Точно!", "Верно!").
    2. Дай подсказку для **СЛЕДУЮЩЕГО** слова/части. Пример: "Отлично! Теперь добавим слово 'взгляд'. Как это будет по-немецки?"
    3. Сгенерируй новый \`wordOptions\` для этого шага.
- **Если пользователь ответил НЕПРАВИЛЬНО:**
    1. Мягко поправь.
    2. Дай **БОЛЕЕ ЯВНУЮ** подсказку для **ТЕКУЩЕГО** шага. Пример: "Не совсем. Немецкое слово буквально означает 'комната для сна'. Попробуй еще раз."
    3. Предложи тот же или слегка измененный набор \`wordOptions\`.
- **Если пользователь просит помощи ("не знаю", "подскажи"):**
    1. Дай ему прямой ответ на текущий шаг. Пример: "Это слово 'Schlafzimmer'. Давай добавим его."
    2. Сразу переходи к подсказке для следующего шага.

**Шаг 4: Завершение.**
- Когда вся фраза собрана правильно, установи \`isCorrect: true\`.
- В \`responseParts\` напиши поздравительное сообщение. Пример: "Великолепно! Ты собрал всю фразу: 'Schlafzimmerblick'. Отличная работа!"
- \`wordOptions\` и \`promptSuggestions\` должны быть пустыми.

**Общие правила:**
- **НИКОГДА** не давай полный ответ до самого конца.
- Всегда отвечай на русском.
- Используй JSON-формат с полями 'responseParts', 'isCorrect', 'promptSuggestions', 'wordOptions'.`;
    
    const userMessage = userAnswer || "(Начало сессии, дай первую подсказку)";

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: [...formattedHistory, { role: 'user', parts: [{ text: userMessage }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: learningAssistantResponseSchema,
                temperature: 0.6,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        
        return {
            role: 'model',
            contentParts: parsedResponse.responseParts || [{ type: 'text', text: 'Произошла ошибка.' }],
            isCorrect: parsedResponse.isCorrect || false,
            promptSuggestions: parsedResponse.promptSuggestions || [],
            wordOptions: parsedResponse.wordOptions || [],
        };

    } catch (error) {
        console.error("Error in guideToTranslation with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const translationChatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        ...chatResponseSchema.properties, // Inherit responseParts and promptSuggestions
        suggestion: {
            type: Type.OBJECT,
            description: "An optional suggested improvement for the Russian and German phrases.",
            properties: {
                russian: { type: Type.STRING, description: "The suggested new Russian phrase." },
                german: { type: Type.STRING, description: "The suggested new German phrase." }
            },
            required: ["russian", "german"]
        }
    },
    required: ["responseParts", "promptSuggestions"]
};


const discussTranslation: AiService['discussTranslation'] = async (request) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const systemInstruction = `Ты AI-помощник и эксперт по немецкому языку. Пользователь недоволен переводом и хочет его улучшить.
Исходная русская фраза: "${request.originalRussian}"
Текущий немецкий перевод: "${request.currentGerman}"

Твоя задача:
1.  Ответь на запрос пользователя, помогая ему найти лучший перевод. Общайся на русском.
2.  Если в ходе диалога ты приходишь к выводу, что фразу можно улучшить, ОБЯЗАТЕЛЬНО включи в свой JSON-ответ поле \`suggestion\`. Это поле должно содержать объект с ключами \`russian\` и \`german\` с финальным, улучшенным вариантом. Возможно, для лучшего перевода придется немного изменить и русскую фразу.
3.  Если ты не предлагаешь конкретного изменения, НЕ включай поле \`suggestion\`.
4.  Всегда разбивай свой текстовый ответ на \`responseParts\` и предлагай новые вопросы в \`promptSuggestions\`.
5.  Будь краток и по делу.`;
    
    const formattedHistory = request.history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text || msg.contentParts?.map(p => p.text).join('') || '' }]
    }));

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: [...formattedHistory, { role: 'user', parts: [{ text: request.userRequest }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: translationChatResponseSchema,
                temperature: 0.6,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        return {
            role: 'model',
            contentParts: parsedResponse.responseParts || [{ type: 'text', text: 'Error parsing response.' }],
            suggestion: parsedResponse.suggestion,
            promptSuggestions: parsedResponse.promptSuggestions || [],
        };

    } catch (error) {
        console.error("Error discussing translation with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};


const deepDiveAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        chunks: {
            type: Type.ARRAY,
            description: "The German phrase broken down into grammatical chunks.",
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, description: "Grammatical type, e.g., 'Noun', 'Verb', 'Article', 'Adjective', 'Adverb', 'Preposition', 'Pronoun', 'Conjunction', 'Particle'." },
                    explanation: { type: Type.STRING, description: "A brief explanation of the chunk's role in Russian." },
                },
                required: ["text", "type", "explanation"]
            }
        },
        keyConcepts: {
            type: Type.ARRAY,
            description: "A list of key semantic concepts within the phrase.",
            items: {
                type: Type.OBJECT,
                properties: {
                    concept: { type: Type.STRING, description: "The key concept in German." },
                    explanation: { type: Type.STRING, description: "A brief explanation in Russian." },
                },
                required: ["concept", "explanation"]
            }
        },
        personalizationQuestion: {
            type: Type.STRING,
            description: "A thought-provoking question in Russian to help the user connect the phrase to their own life (Self-Reference Effect)."
        },
        mnemonicImage: {
            type: Type.OBJECT,
            description: "A vivid, memorable, and slightly absurd mnemonic image to help encode the phrase.",
            properties: {
                description: { type: Type.STRING, description: "A detailed description of the memorable scene in Russian." },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords from the scene." }
            },
            required: ["description", "keywords"]
        }
    },
    required: ["chunks", "keyConcepts", "personalizationQuestion", "mnemonicImage"]
};

const generateDeepDiveAnalysis: AiService['generateDeepDiveAnalysis'] = async (phrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Ты — AI-ассистент, специализирующийся на когнитивных техниках запоминания. Пользователь изучает немецкую фразу: "${phrase.german}" (перевод: "${phrase.russian}").
Проведи глубокий когнитивный анализ этой фразы, следуя трём этапам, и верни результат в виде JSON-объекта.

**Этап 1: Деконструкция (Анализ)**
- **chunks**: Разбей немецкую фразу на грамматические чанки (отдельные слова или небольшие группы). Для каждого чанка укажи его тип (например, 'Noun', 'Verb', 'Adjective', 'Preposition') и краткое объяснение его роли на русском языке.
- **keyConcepts**: Выдели 1-3 ключевых семантических понятия во фразе и дай им краткое объяснение на русском.

**Этап 2: Персонализация (Углубление)**
- **personalizationQuestion**: Сформулируй один наводящий вопрос на русском, который поможет пользователю связать фразу с его личным опытом, чувствами или воспоминаниями. Это должно активировать эффект самореференции. Вопрос должен быть открытым и поощрять воображение.

**Этап 3: Кодирование (Мнемоника)**
- **mnemonicImage**: Создай яркий, запоминающийся, мультисенсорный и, возможно, абсурдный мнемонический образ или короткую сцену, которая кодирует смысл всей фразы.
  - **description**: Подробно опиши эту сцену на русском языке.
  - **keywords**: Укажи 2-4 ключевых слова из этого образа.

Верни только JSON-объект, соответствующий предоставленной схеме.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: deepDiveAnalysisSchema,
                temperature: 0.8,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as DeepDiveAnalysis;

    } catch (error) {
        console.error("Error generating deep dive analysis with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const movieExamplesSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'The original title of the movie.' },
            titleRussian: { type: Type.STRING, description: 'The Russian translation of the movie title.' },
            dialogue: { type: Type.STRING, description: 'The exact dialogue snippet in German containing the phrase.' },
            dialogueRussian: { type: Type.STRING, description: 'The Russian translation of the dialogue snippet.' },
        },
        required: ["title", "titleRussian", "dialogue", "dialogueRussian"],
    }
};

const generateMovieExamples: AiService['generateMovieExamples'] = async (phrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Найди до 5 примеров из диалогов популярных фильмов, где используется немецкая фраза "${phrase.german}". Фильмы могут быть как немецкого производства, так и популярные международные фильмы с качественным немецким дубляжом. Для каждого примера укажи:
1. Оригинальное название фильма ('title').
2. Название фильма на русском языке ('titleRussian').
3. Фрагмент диалога на немецком языке ('dialogue').
4. Перевод этого фрагмента на русский язык ('dialogueRussian').
Верни результат в виде JSON-массива объектов, соответствующего схеме.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: movieExamplesSchema,
                temperature: 0.7,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MovieExample[];

    } catch (error) {
        console.error("Error generating movie examples with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const wordAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        word: { type: Type.STRING },
        partOfSpeech: { type: Type.STRING, description: 'The part of speech (e.g., "Существительное", "Глагол").' },
        translation: { type: Type.STRING, description: 'The Russian translation of the word.' },
        nounDetails: {
            type: Type.OBJECT,
            properties: {
                article: { type: Type.STRING, description: 'The article (der, die, das).' },
                plural: { type: Type.STRING, description: 'The plural form.' },
            },
        },
        verbDetails: {
            type: Type.OBJECT,
            properties: {
                infinitive: { type: Type.STRING, description: 'The infinitive form.' },
                tense: { type: Type.STRING, description: 'The tense (e.g., "Präsens").' },
                person: { type: Type.STRING, description: 'The person and number (e.g., "1-е лицо, ед.ч.").' },
            },
        },
        exampleSentence: { type: Type.STRING, description: 'A new example sentence in German using the word.' },
        exampleSentenceTranslation: { type: Type.STRING, description: 'The Russian translation of the example sentence.' },
    },
    required: ["word", "partOfSpeech", "translation", "exampleSentence", "exampleSentenceTranslation"],
};

const analyzeWordInPhrase: AiService['analyzeWordInPhrase'] = async (phrase, word) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Проведи лингвистический анализ немецкого слова "${word}" в контексте фразы "${phrase.german}".
Верни JSON-объект со следующей информацией:
1.  **word**: анализируемое слово.
2.  **partOfSpeech**: часть речи на русском (например, "Существительное", "Глагол", "Прилагательное").
3.  **translation**: перевод слова на русский.
4.  **nounDetails**: если слово — существительное, укажи его артикль ('article') и форму множественного числа ('plural'). Если нет, пропусти это поле.
5.  **verbDetails**: если слово — глагол, укажи его инфинитив ('infinitive'), время ('tense') и лицо/число ('person'). Если нет, пропусти это поле.
6.  **exampleSentence**: новое предложение-пример на немецком, использующее это слово.
7.  **exampleSentenceTranslation**: перевод предложения-примера на русский.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: wordAnalysisSchema,
                temperature: 0.5,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as WordAnalysis;

    } catch (error) {
        console.error("Error analyzing word with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const verbConjugationSchema = {
    type: Type.OBJECT,
    properties: {
        infinitive: { type: Type.STRING },
        presentTense: {
            type: Type.OBJECT,
            properties: {
                ich: { type: Type.STRING },
                du: { type: Type.STRING },
                er_sie_es: { type: Type.STRING, description: "Conjugation for er/sie/es" },
                wir: { type: Type.STRING },
                ihr: { type: Type.STRING },
                sie_Sie: { type: Type.STRING, description: "Conjugation for sie (plural) and Sie (formal)" },
            },
            required: ["ich", "du", "er_sie_es", "wir", "ihr", "sie_Sie"],
        }
    },
    required: ["infinitive", "presentTense"],
};

const conjugateVerb: AiService['conjugateVerb'] = async (infinitive) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Предоставь спряжение немецкого глагола "${infinitive}" в настоящем времени (Präsens). Верни JSON-объект, содержащий инфинитив и формы для 'ich', 'du', 'er_sie_es', 'wir', 'ihr', 'sie_Sie'.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: verbConjugationSchema,
                temperature: 0.2,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as VerbConjugation;

    } catch (error) {
        console.error("Error conjugating verb with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const nounDeclensionSchema = {
    type: Type.OBJECT,
    properties: {
        noun: { type: Type.STRING },
        singular: {
            type: Type.OBJECT,
            properties: {
                nominativ: { type: Type.STRING, description: "Singular Nominativ (e.g., 'der Tisch')" },
                akkusativ: { type: Type.STRING, description: "Singular Akkusativ (e.g., 'den Tisch')" },
                dativ: { type: Type.STRING, description: "Singular Dativ (e.g., 'dem Tisch')" },
                genitiv: { type: Type.STRING, description: "Singular Genitiv (e.g., 'des Tisches')" },
            },
            required: ["nominativ", "akkusativ", "dativ", "genitiv"],
        },
        plural: {
            type: Type.OBJECT,
            properties: {
                nominativ: { type: Type.STRING, description: "Plural Nominativ (e.g., 'die Tische')" },
                akkusativ: { type: Type.STRING, description: "Plural Akkusativ (e.g., 'die Tische')" },
                dativ: { type: Type.STRING, description: "Plural Dativ (e.g., 'den Tischen')" },
                genitiv: { type: Type.STRING, description: "Plural Genitiv (e.g., 'der Tische')" },
            },
            required: ["nominativ", "akkusativ", "dativ", "genitiv"],
        },
    },
    required: ["noun", "singular", "plural"],
};

const declineNoun: AiService['declineNoun'] = async (noun, article) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Предоставь склонение немецкого существительного "${noun}" с артиклем "${article}" по всем 4 падежам (Nominativ, Akkusativ, Dativ, Genitiv) для единственного (singular) и множественного (plural) числа. Включи определенный артикль в каждую форму. Верни JSON-объект.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: nounDeclensionSchema,
                temperature: 0.2,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as NounDeclension;

    } catch (error) {
        console.error("Error declining noun with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const sentenceContinuationSchema = {
    type: Type.OBJECT,
    properties: {
        german: {
            type: Type.STRING,
            description: "The correct German translation of the provided Russian phrase."
        },
        continuations: {
            type: Type.ARRAY,
            description: "An array of 7 to 10 short, logical, and diverse continuation options in Russian. These should be clean words or phrases without any leading punctuation or connectors.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["german", "continuations"]
};

const generateSentenceContinuations: AiService['generateSentenceContinuations'] = async (russianPhrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

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
        - Варианты должны быть короткими, "чистыми" словами или фразами на русском без знаков препинания в начале.

Верни результат в виде JSON-объекта, соответствующего схеме.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: sentenceContinuationSchema,
                temperature: 0.8,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as SentenceContinuation;

    } catch (error) {
        console.error("Error generating sentence continuations with Gemini:", error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }
};

const duplicateSchema = {
    type: Type.OBJECT,
    properties: {
        duplicateGroups: {
            type: Type.ARRAY,
            description: "An array of groups. Each group is an array of phrase IDs that are semantically duplicates.",
            items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    },
    required: ["duplicateGroups"]
};

const findDuplicatePhrases: AiService['findDuplicatePhrases'] = async (phrases) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");
    if (phrases.length < 2) return { duplicateGroups: [] };

    const prompt = `Here is a list of phrases: ${JSON.stringify(phrases.map(p => ({ id: p.id, russian: p.russian })))}. 
Analyze them and identify groups of phrases that are semantic duplicates. Ignore minor differences in wording, articles, capitalization, punctuation, or leading/trailing whitespace if the core meaning is identical. For example, "Я хочу пить", "а я хочу пить", and "Мне хочется пить" are all duplicates. Return a JSON object containing an array of these groups of phrase IDs. Only include groups with 2 or more phrases.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: duplicateSchema,
                temperature: 0.1,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.duplicateGroups ? { duplicateGroups: result.duplicateGroups.filter((g:string[]) => g.length > 1) } : { duplicateGroups: [] };
    } catch (error) {
        console.error("Error finding duplicate phrases with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};

const phraseBuilderOptionsSchema = {
    type: Type.OBJECT,
    properties: {
        words: {
            type: Type.ARRAY,
            description: "An array of shuffled word blocks including correct words and distractors.",
            items: { type: Type.STRING }
        }
    },
    required: ["words"]
};

const generatePhraseBuilderOptions: AiService['generatePhraseBuilderOptions'] = async (phrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");
    
    const prompt = `Для упражнения "собери фразу" по немецкому языку, подготовь набор слов.
Исходная фраза на русском: "${phrase.russian}"
Правильный перевод на немецком: "${phrase.german}"

Твоя задача:
1.  Включи в набор ВСЕ слова из правильного немецкого перевода. ВАЖНО: Сохраняй знаки препинания (точки, вопросительные знаки) как часть последнего слова. Например: "Hallo.", "geht's?".
2.  Добавь 5-7 "отвлекающих" слов. Это должны быть правдоподобные, но неверные варианты:
    - Слова с похожим значением (синонимы, которые не подходят по контексту).
    - Неправильные грамматические формы (другой падеж, другое время глагола, неправильное окончание прилагательного).
    - Слова, которые часто путают (ложные друзья переводчика).
    - Лишние артикли или предлоги.
3.  Перемешай все слова в случайном порядке.
4.  Верни результат в виде JSON-объекта с одним ключом "words", содержащим массив строк.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: phraseBuilderOptionsSchema,
                temperature: 0.9,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PhraseBuilderOptions;
    } catch (error) {
        console.error("Error generating phrase builder options with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};


const phraseEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        isCorrect: { type: Type.BOOLEAN },
        feedback: { type: Type.STRING, description: "Constructive feedback in Russian." },
        correctedPhrase: { type: Type.STRING, description: "The correct phrase, if the user's attempt was wrong." }
    },
    required: ["isCorrect", "feedback"]
};

const evaluatePhraseAttempt: AiService['evaluatePhraseAttempt'] = async (phrase, userAttempt) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

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
5.  Отвечай на русском языке.

Верни JSON-объект.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: phraseEvaluationSchema,
                temperature: 0.5,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PhraseEvaluation;
    } catch (error) {
        console.error("Error evaluating phrase attempt with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};

const evaluateSpokenPhraseAttempt: AiService['evaluateSpokenPhraseAttempt'] = async (phrase, userAttempt) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

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
    - Объясни, **почему** это ошибка (например, "Порядок слов здесь немного другой..." или "Существительное 'Tisch' мужского рода, поэтому нужен артикль 'der'").
    - ОБЯЗАТЕЛЬНО приведи правильный вариант в поле \`correctedPhrase\`.
4.  Твой тон должен быть позитивным и педагогичным.
5.  Отвечай на русском языке.

Верни JSON-объект.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: phraseEvaluationSchema,
                temperature: 0.4,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PhraseEvaluation;
    } catch (error) {
        console.error("Error evaluating spoken phrase attempt with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};


const healthCheck: AiService['healthCheck'] = async () => {
    const api = initializeApi();
    if (!api) return false;
    try {
        // Using a very simple, low-token prompt for the check
        await api.models.generateContent({ model, contents: 'Hi' });
        return true;
    } catch (error) {
        const message = (error as any)?.message || 'Unknown error';
        console.error("Gemini health check failed:", message);
        return false;
    }
};


export const geminiService: AiService = {
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
    getProviderName: () => "Google Gemini",
};