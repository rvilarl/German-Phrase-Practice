
import { GoogleGenAI, Type } from "@google/genai";
import type { Phrase, ChatMessage, ExamplePair, ProactiveSuggestion, ContentPart, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, AdjectiveDeclension, SentenceContinuation, TranslationChatRequest, TranslationChatResponse, PhraseBuilderOptions, PhraseEvaluation, CategoryAssistantRequest, CategoryAssistantResponse, CategoryAssistantRequestType } from '../types';
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

const cardsFromTranscriptSchema = {
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

const generateCardsFromTranscript: AiService['generateCardsFromTranscript'] = async (transcript, sourceLang) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");
    
    const targetLang = sourceLang === 'ru' ? 'German' : 'Russian';

    const prompt = `You are an expert linguist and a methodologist for creating language learning materials. Your task is to analyze a provided text transcript of spoken language and break it down into high-quality, logically complete flashcards for Spaced Repetition System (SRS) learning.

Analyze the following text, which is a transcript of ${sourceLang === 'ru' ? 'Russian' : 'German'} speech:
"""
${transcript}
"""

Instructions:
1.  **Analyze Context:** First, understand the context: is it a monologue, a dialogue, or chaotic speech from multiple participants? The text might contain broken phrases, filler words ('umm', 'well'), repetitions, or interruptions. Your job is to extract coherent and logical phrases suitable for learning.
2.  **Decomposition Rules:**
    *   Break down long, complex sentences into shorter, self-sufficient semantic blocks. Each block should be a useful phrase to learn.
    *   For example, if you see the sentence: "I'll go home because I have a very bad headache and I also need to make dinner", you should split it into cards like: "I'll go home", "because I have a very bad headache", "I need to make dinner".
    *   Clean up filler words and repetitions to make the phrases natural and useful.
3.  **Translation and Formatting:**
    *   For each extracted phrase, generate an accurate and natural translation into ${targetLang}.
    *   Return the result ONLY as a JSON array of objects. Each object must have two keys: 'russian' and 'german'.

Example Output Format:
[
  { "russian": "я пойду домой", "german": "ich gehe nach Hause" },
  { "russian": "потому что у меня сильно болит голова", "german": "weil ich starke Kopfschmerzen habe" }
]`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: cardsFromTranscriptSchema,
                temperature: 0.6,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating cards from transcript with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};

const generateTopicCards: AiService['generateTopicCards'] = async (topic, refinement, existingPhrases) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const refinementPrompt = refinement
        ? `\n\nПользователь был не удовлетворен предыдущими результатами и дал следующее уточнение: "${refinement}". Пожалуйста, сгенерируй новый список, строго следуя этому уточнению.`
        : '';

    const existingPhrasesPrompt = existingPhrases && existingPhrases.length > 0
        ? `\n\nВажно: В категории уже есть следующие фразы: "${existingPhrases.join('; ')}". Не повторяй их. Придумай новые, уникальные и полезные слова/фразы по этой теме.`
        : '';

    const prompt = `Ты — AI-ассистент для изучения немецкого языка. Пользователь хочет получить набор карточек на определенную тему.
Тема запроса: "${topic}"${refinementPrompt}${existingPhrasesPrompt}

Твоя задача:
1.  Проанализируй запрос пользователя.
2.  Сгенерируй список из 10-15 полезных, разнообразных немецких слов и фраз с русским переводом по этой теме. Фразы должны быть естественными и часто употребимыми.
3.  Верни результат ТОЛЬКО как JSON-массив объектов. Каждый объект должен иметь два ключа: 'russian' и 'german'.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: phraseSchema,
                temperature: 0.6,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedCards = JSON.parse(jsonText);

        if (!Array.isArray(parsedCards)) {
            throw new Error("API did not return an array of cards.");
        }
        
        return parsedCards;

    } catch (error) {
        console.error("Error generating topic cards with Gemini:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
    }
};

const topicClassificationSchema = {
    type: Type.OBJECT,
    properties: {
        isCategory: {
            type: Type.BOOLEAN,
            description: "True if the topic is a closed, well-defined set of concepts suitable for a dedicated category (e.g., 'Days of the week', 'Colors', 'Family members'). False otherwise (e.g., 'How to apologize')."
        },
        categoryName: {
            type: Type.STRING,
            description: "A short, suitable name for the category if isCategory is true. Should be in Russian. E.g., 'Дни недели', 'Цвета'. Empty string if isCategory is false."
        }
    },
    required: ["isCategory", "categoryName"]
};

const classifyTopic: AiService['classifyTopic'] = async (topic) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Пользователь ввел тему для изучения: "${topic}". Является ли эта тема замкнутым, четко определенным набором понятий (например, дни недели, месяцы, цвета, члены семьи, города страны, пальцы рук)? Ответь 'да' или 'нет' и предложи короткое, подходящее название для категории на русском языке.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: topicClassificationSchema,
                temperature: 0.3,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error classifying topic with Gemini:", error);
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
                                translation: { type: Type.STRING, description: "Russian translation of the text, ONLY if type is 'german'." }
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
2. Проанализируй фразу и предложи 1-2 уникальных, полезных совета или альтернативы. Например, для "ich hätte gern" можно предложить "ich möchte". Сделай советы краткими и по делу. ВАЖНО: Разбей содержание каждого совета на массив 'contentParts'. Каждый элемент массива должно быть объектом с 'type' и 'text'. Если часть ответа - обычный текст, используй 'type': 'text'. Если это немецкое слово или фраза, используй 'type': 'german' и ОБЯЗАТЕЛЬНО предоставь русский перевод в поле 'translation'.
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
                    translation: { type: Type.STRING, description: "Russian translation of the text, ONLY if type is 'german'." }
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
1. Отвечай на вопросы пользователя. В своем ответе ОБЯЗАТЕЛЬНО используй предоставленную JSON-схему. Разбей свой ответ на массив 'responseParts'. Каждый элемент массива должен быть объектом с ключами 'type' и 'text'. Если часть ответа - это обычный текст на русском, используй 'type': 'text'. Если это немецкое слово или фраза, используй 'type': 'german'. Если 'type' равен 'german', ОБЯЗАТЕЛЬНО предоставь перевод в поле 'translation'. Не используй Markdown в JSON. Сохраняй форматирование с помощью переносов строк (\\n) в текстовых блоках.
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
        },
        cheatSheetOptions: {
            type: Type.ARRAY,
            description: "An optional list of cheat sheet buttons to show the user based on the current question.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['verbConjugation', 'nounDeclension', 'pronouns', 'wFragen'] },
                    label: { type: Type.STRING, description: "The button text, e.g., 'Спряжение глагола'" },
                    data: { type: Type.STRING, description: "Data for the cheat sheet. Verb infinitive, or a JSON string for nouns like '{\"noun\":\"Tisch\",\"article\":\"der\"}'." }
                },
                required: ["type", "label", "data"]
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
- Разбей правильный немецкий перевод на **семантические блоки (чанки)**. Блок — это одно слово или **устойчивое словосочетание**, которое не следует разделять (например, "hätte gern", "es gibt", "zum Beispiel", "ich möchte").
- **КЛЮЧЕВОЕ ПРАВИЛО:** Не разбивай фразу просто на отдельные слова. Ищи словосочетания, которые несут единый смысл.

**Шаг 2: Первая подсказка (первое сообщение пользователю).**
1.  Начни с первого **блока**.
2.  Задай наводящий вопрос, который поможет пользователю угадать этот блок. Пример для "Ich hätte gern einen Kaffee": "Начнем с вежливой просьбы. Какое устойчивое выражение в немецком используется для 'я бы хотел' или 'мне бы хотелось'?"
3.  Сформируй \`wordOptions\`, включив в них правильный блок ("hätte gern") и несколько отвлекающих вариантов (отдельные слова "hätte", "gern", "möchte", "will").

**Шаг 3: Последующие шаги.**
- **Если пользователь ответил ПРАВИЛЬНО (выбрал верный блок):**
    1.  Похвали его ("Точно!", "Верно!").
    2.  Дай ПОДСКАЗКУ для **СЛЕДУЮЩЕГО** блока. Твои подсказки должны быть тонкими и наводящими.
    3.  Сгенерируй новый \`wordOptions\` для этого шага.
- **Если пользователь ответил НЕПРАВИЛЬНО:**
    1.  Мягко поправь.
    2.  Дай **БОЛЕЕ ЯВНУЮ**, но все еще не прямую подсказку для **ТЕКУЩЕГО** блока.
    3.  Предложи тот же или слегка измененный набор \`wordOptions\`.
- **Если пользователь выбрал "Не знаю":**
    1.  Дай ему прямой ответ на текущий шаг. Пример: "Это выражение 'hätte gern'. Давай добавим его."
    2.  Сразу переходи к подсказке для следующего шага.

**Шаг 4: Завершение.**
- Когда вся фраза собрана правильно, установи \`isCorrect: true\`.
- В \`responseParts\` напиши поздравительное сообщение.
- \`wordOptions\` и \`promptSuggestions\` должны быть пустыми.

**Правила для генерируемых полей:**
- \`wordOptions\`: **ВСЕГДА** включай "Не знаю" как первый элемент массива, если только фраза не собрана полностью (\`isCorrect: true\`). Варианты могут быть как отдельными словами, так и словосочетаниями.
- \`promptSuggestions\`: Должны быть обучающими вопросами, а не прямыми подсказками. Примеры: 'Какой падеж здесь нужен?', 'Почему такой порядок слов?', 'Можно ли сказать это иначе?'. Избегай подсказок вроде 'Как сказать "взгляд"?'.
- \`cheatSheetOptions\`: Включай шпаргалки, только когда твой вопрос напрямую касается их темы. **ВАЖНО:** Текст кнопки (\`label\`) должен быть ОБЩИМ и НЕ должен содержать сам ответ.
    - **ПРАВИЛЬНО:** Если спрашиваешь про глагол, \`label\` должен быть "Спряжение глагола".
    - **НЕПРАВИЛЬНО:** \`label\`: "Спряжение: gehen".
    - **ПРАВИЛЬНО:** Если спрашиваешь про артикль, \`label\` должен быть "Склонение существительного".
    - **НЕПРАВИЛЬНО:** \`label\`: "Склонение: der Tisch".
- **Общие правила:**
    - **КЛЮЧЕВОЕ ПРАВИЛО:** Твоя задача — давать пошаговые подсказки, а не готовый ответ. Не включай полную немецкую фразу \`${phrase.german}\` в свой ответ (в поле \`responseParts\`) и не предлагай "примеры использования", пока пользователь не соберет фразу полностью и правильно. Устанавливай \`isCorrect: true\` только после того, как пользователь успешно предоставил ПОЛНЫЙ и ПРАВИЛЬНЫЙ перевод.
    - Всегда отвечай на русском.
    - Используй JSON-формат со всеми полями из схемы. Поле \`cheatSheetOptions\` является необязательным.`;
    
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
            cheatSheetOptions: parsedResponse.cheatSheetOptions || [],
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
4.  Твой ответ ДОЛЖЕН быть ТОЛЬКО в формате JSON, строго соответствующем предоставленной схеме. Не добавляй никакого текста до или после JSON. Всегда разбивай свой текстовый ответ на массив \`responseParts\` и предлагай новые вопросы в \`promptSuggestions\`.
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

        if (!parsedResponse || !Array.isArray(parsedResponse.responseParts) || !Array.isArray(parsedResponse.promptSuggestions)) {
            console.error("Invalid response structure from Gemini discussTranslation:", parsedResponse);
            const textFallback = (parsedResponse && typeof parsedResponse === 'object') 
                ? JSON.stringify(parsedResponse) 
                : 'Invalid response';
            throw new Error(`AI returned an unexpected response format. Raw: ${textFallback}`);
        }

        return {
            role: 'model',
            contentParts: parsedResponse.responseParts.length > 0 
                ? parsedResponse.responseParts 
                : [{ type: 'text', text: 'AI не предоставил текстовый ответ.' }],
            suggestion: parsedResponse.suggestion,
            promptSuggestions: parsedResponse.promptSuggestions || [],
        };

    } catch (error) {
        console.error("Error discussing translation with Gemini:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
            throw new Error("Не удалось разобрать JSON-ответ от AI. Неверный формат.");
        }
        throw new Error(`Ошибка вызова Gemini API: ${(error as any)?.message || 'Unknown error'}`);
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
        partOfSpeech: { type: Type.STRING, description: 'The part of speech (e.g., "Существительное", "Глагол", "Прилагательное").' },
        translation: { type: Type.STRING, description: 'The Russian translation of the word.' },
        baseForm: { type: Type.STRING, description: 'The base form, especially for adjectives (e.g., "gut" for "guten").' },
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
4.  **baseForm**: если слово — прилагательное, укажи его базовую (словарную) форму. Например, для "guten" это будет "gut".
5.  **nounDetails**: если слово — существительное, укажи его артикль ('article') и форму множественного числа ('plural'). Если нет, пропусти это поле.
6.  **verbDetails**: если слово — глагол, укажи его инфинитив ('infinitive'), время ('tense') и лицо/число ('person'). Если нет, пропусти это поле.
7.  **exampleSentence**: новое предложение-пример на немецком, использующее это слово.
8.  **exampleSentenceTranslation**: перевод предложения-примера на русский.`;

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

const pronounConjugationSchema = {
    type: Type.OBJECT,
    properties: {
        pronoun: { type: Type.STRING, description: 'The personal pronoun (e.g., "ich", "du", "er/sie/es").' },
        german: { type: Type.STRING, description: 'The full example sentence in German for this pronoun.' },
        russian: { type: Type.STRING, description: 'The Russian translation of the German sentence.' },
    },
    required: ["pronoun", "german", "russian"],
};

const tenseFormsSchema = {
    type: Type.OBJECT,
    properties: {
        statement: { type: Type.ARRAY, items: pronounConjugationSchema, description: "An array of declarative statements for all pronouns." },
        question: { type: Type.ARRAY, items: pronounConjugationSchema, description: "An array of interrogative sentences for all pronouns." },
        negative: { type: Type.ARRAY, items: pronounConjugationSchema, description: "An array of negative sentences for all pronouns." },
    },
    required: ["statement", "question", "negative"],
};

const verbConjugationSchema = {
    type: Type.OBJECT,
    properties: {
        infinitive: { type: Type.STRING },
        past: { ...tenseFormsSchema, description: 'Forms for the Past (Perfekt) tense.' },
        present: { ...tenseFormsSchema, description: 'Forms for the Present (Präsens) tense.' },
        future: { ...tenseFormsSchema, description: 'Forms for the Future (Futur I) tense.' },
    },
    required: ["infinitive", "past", "present", "future"],
};

const conjugateVerb: AiService['conjugateVerb'] = async (infinitive) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Ты — эксперт по грамматике немецкого языка. Предоставь полную матрицу спряжения для глагола "${infinitive}".

Матрица должна включать три времени (прошедшее, настоящее, будущее) и три формы (утвердительная, вопросительная, отрицательная).

**КЛЮЧЕВОЕ ТРЕБОВАНИЕ:** Для каждой ячейки матрицы (например, "Настоящее время, Утверждение") предоставь полный список спряжений для ВСЕХ личных местоимений: ich, du, er/sie/es, wir, ihr, sie/Sie.

Правила:
1.  Для каждого местоимения в каждой ячейке предоставь:
    - 'pronoun': само местоимение (например, "ich", "du"). Для 'er/sie/es' и 'sie/Sie' используй именно такую запись.
    - 'german': полный, грамматически верный пример предложения.
    - 'russian': точный перевод этого предложения на русский.
2.  Для прошедшего времени используй Perfekt (например, "ich habe gesagt").
3.  Для будущего времени используй Futur I (например, "ich werde sagen").
4.  Отрицание строй с помощью "nicht" в правильной позиции.
5.  Вопросительное предложение начинай с глагола (Ja/Nein-Frage).

Верни результат в виде JSON-объекта, соответствующего предоставленной схеме.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: verbConjugationSchema,
                temperature: 0.3,
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

const caseSchema = {
    type: Type.OBJECT,
    properties: {
        nominativ: { type: Type.STRING },
        akkusativ: { type: Type.STRING },
        dativ: { type: Type.STRING },
        genitiv: { type: Type.STRING },
    },
    required: ["nominativ", "akkusativ", "dativ", "genitiv"],
};

const adjectiveDeclensionTableSchema = {
    type: Type.OBJECT,
    properties: {
        masculine: caseSchema,
        feminine: caseSchema,
        neuter: caseSchema,
        plural: caseSchema,
    },
    required: ["masculine", "feminine", "neuter", "plural"],
};

const adjectiveDeclensionSchema = {
    type: Type.OBJECT,
    properties: {
        adjective: { type: Type.STRING },
        comparison: {
            type: Type.OBJECT,
            properties: {
                positive: { type: Type.STRING },
                comparative: { type: Type.STRING },
                superlative: { type: Type.STRING },
            },
            required: ["positive", "comparative", "superlative"],
        },
        weak: adjectiveDeclensionTableSchema,
        mixed: adjectiveDeclensionTableSchema,
        strong: adjectiveDeclensionTableSchema,
    },
    required: ["adjective", "comparison", "weak", "mixed", "strong"],
};

const declineAdjective: AiService['declineAdjective'] = async (adjective) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Ты — эксперт по грамматике немецкого языка. Предоставь полную информацию о прилагательном "${adjective}".
1.  **Comparison**: Укажи три степени сравнения: положительную (positive), сравнительную (comparative) и превосходную (superlative).
2.  **Declension**: Предоставь три полные таблицы склонения (слабое - weak, смешанное - mixed, сильное - strong).
    - Каждая таблица должна включать все падежи (nominativ, akkusativ, dativ, genitiv) для всех родов (masculine, feminine, neuter) и множественного числа (plural).
    - ВАЖНО: В каждой форме прилагательного выдели окончание с помощью Markdown bold, например: "schön**en**".
Верни результат в виде единого JSON-объекта.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: adjectiveDeclensionSchema,
                temperature: 0.2,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AdjectiveDeclension;

    } catch (error) {
        console.error("Error declining adjective with Gemini:", error);
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
    
    const prompt = `Создай набор слов для упражнения "собери фразу".
Немецкая фраза: "${phrase.german}" (Русский перевод: "${phrase.russian}").

Правила:
1. Включи в набор ВСЕ слова из немецкой фразы. Знаки препинания должны оставаться частью слова (например, "Hallo.").
2. Добавь 5-7 подходящих, но неверных "отвлекающих" слов (например, неправильные грамматические формы, синонимы не по контексту, лишние артикли).
3. Перемешай все слова случайным образом.
4. Верни JSON-объект с одним ключом "words", который содержит массив всех слов.`;

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

const quickReplyOptionsSchema = {
    type: Type.OBJECT,
    properties: {
        options: {
            type: Type.ARRAY,
            description: "An array of 3 plausible but incorrect distractor options in German.",
            items: { type: Type.STRING }
        }
    },
    required: ["options"]
};

const generateQuickReplyOptions: AiService['generateQuickReplyOptions'] = async (phrase) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");

    const prompt = `Для немецкой фразы "${phrase.german}" (перевод: "${phrase.russian}"), сгенерируй 3 правдоподобных, но неверных варианта ответа на немецком языке. Эти варианты будут использоваться в тесте с множественным выбором. Они должны быть похожи на правильный ответ, но содержать распространенные ошибки. Верни JSON-объект с ключом "options", который содержит массив из 3 строк-дистракторов на немецком.`;

    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quickReplyOptionsSchema,
                temperature: 0.9,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as { options: string[] };
    } catch (error) {
        console.error("Error generating quick reply options with Gemini:", error);
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

const categoryAssistantResponseSchema = {
    type: Type.OBJECT,
    properties: {
        responseType: { type: Type.STRING, enum: ['text', 'proposed_cards', 'phrases_to_review', 'phrases_to_delete'] },
        responseParts: {
            type: Type.ARRAY,
            description: "The main text response, broken into segments of plain text and German text. Use Markdown for formatting like lists or bold text within 'text' type parts. Format dialogues using Markdown like '**Person A:** '.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['text', 'german'] },
                    text: { type: Type.STRING },
                    translation: { type: Type.STRING, description: "Russian translation ONLY if type is 'german'." }
                },
                required: ["type", "text"],
            }
        },
        promptSuggestions: {
            type: Type.ARRAY,
            description: "A list of 2-4 new, context-aware follow-up questions in Russian that the user might ask next.",
            items: {
                type: Type.STRING
            }
        },
        proposedCards: {
            type: Type.ARRAY,
            description: 'A list of new cards. Only for responseType "proposed_cards".',
            items: {
                type: Type.OBJECT,
                properties: {
                    german: { type: Type.STRING },
                    russian: { type: Type.STRING }
                },
                required: ['german', 'russian']
            }
        },
        phrasesToReview: {
            type: Type.ARRAY,
            description: 'A list of inconsistent phrases. Only for responseType "phrases_to_review".',
            items: {
                type: Type.OBJECT,
                properties: {
                    german: { type: Type.STRING },
                    reason: { type: Type.STRING, description: 'Reason in Russian.' }
                },
                required: ['german', 'reason']
            }
        },
        phrasesForDeletion: {
            type: Type.ARRAY,
            description: 'A list of phrases to delete. Only for responseType "phrases_to_delete".',
            items: {
                type: Type.OBJECT,
                properties: {
                    german: { type: Type.STRING },
                    reason: { type: Type.STRING, description: 'Reason in Russian.' }
                },
                required: ['german', 'reason']
            }
        },
    },
    required: ['responseType', 'responseParts', 'promptSuggestions']
};


const getCategoryAssistantResponse: AiService['getCategoryAssistantResponse'] = async (categoryName, existingPhrases, request) => {
    const api = initializeApi();
    if (!api) throw new Error("Gemini API key not configured.");
    
    const existingPhrasesText = existingPhrases.map(p => `"${p.german}"`).join(', ');

    const requestTextMap: Record<CategoryAssistantRequestType, string> = {
        initial: "Это первое открытие. Поприветствуй пользователя и предложи основные действия.",
        add_similar: "Проанализируй существующие фразы и сгенерируй 10 новых, похожих по теме. Не повторяй существующие.",
        check_homogeneity: "Проанализируй все фразы на тематическое единство. Укажи те, что не подходят, и объясни почему. Если все хорошо, так и скажи.",
        create_dialogue: "Создай короткий диалог, используя как можно больше фраз из списка. Предоставь немецкий вариант с переводом в скобках после каждой реплики и отформатируй его с помощью Markdown.",
        user_text: `Пользователь написал: "${request.text}". Ответь на его запрос.`
    };

    const prompt = `Ты — AI-ассистент в приложении для изучения немецкого. Ты находишься внутри категории "${categoryName}".
Существующие фразы в категории: ${existingPhrasesText || "пока нет"}.

Запрос пользователя: ${requestTextMap[request.type]}

Твоя задача — выполнить запрос и вернуть ответ СТРОГО в формате JSON.

**ПРАВИЛА:**
- **responseType**: Тип ответа ('text', 'proposed_cards', 'phrases_to_review', 'phrases_to_delete').
- **responseParts**: Твой основной текстовый ответ, разбитый на части. Используй 'type':'german' для немецких слов с переводом. Для диалогов используй Markdown-форматирование (например, \`**Собеседник А:** ...\`) внутри частей с 'type':'text'.
- **promptSuggestions**: ВСЕГДА предлагай 3-4 релевантных вопроса для продолжения диалога.
- **proposedCards / phrasesToReview**: Заполняй эти поля только если тип ответа соответствующий.
- **УДАЛЕНИЕ ФРАЗ**: Если пользователь просит удалить, убрать, очистить фразы (например, "удали половину", "оставь только времена года"), выполни следующие действия:
  1. Определи, какие именно фразы из списка существующих нужно удалить.
  2. Установи \`responseType: 'phrases_to_delete'\`.
  3. В поле \`phrasesForDeletion\` верни массив объектов с ключами \`german\` (точный текст фразы для удаления) и \`reason\` (краткое объяснение на русском, почему эта фраза удаляется).
  4. В \`responseParts\` напиши сопроводительное сообщение, например: "Хорошо, я предлагаю удалить следующие фразы, так как они не соответствуют вашему запросу:".`;
    
    try {
        const response = await api.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: categoryAssistantResponseSchema,
                temperature: 0.7,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as CategoryAssistantResponse;

    } catch (error) {
        console.error("Error with Category Assistant:", error);
        throw new Error(`Failed to call the Gemini API: ${(error as any)?.message || 'Unknown error'}`);
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
    declineAdjective,
    generateSentenceContinuations,
    findDuplicatePhrases,
    generatePhraseBuilderOptions,
    evaluatePhraseAttempt,
    evaluateSpokenPhraseAttempt,
    generateQuickReplyOptions,
    healthCheck,
    getProviderName: () => "Google Gemini",
    generateCardsFromTranscript,
    generateTopicCards,
    classifyTopic,
    getCategoryAssistantResponse,
};
