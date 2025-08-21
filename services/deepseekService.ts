import type { Phrase, ChatMessage, DeepDiveAnalysis, ContentPart, MovieExample } from '../types';
import { AiService } from './aiService';
import { getDeepseekApiKey } from './env';

const API_URL = "https://api.deepseek.com/chat/completions";
const model = "deepseek-chat";

const callDeepSeekApi = async (messages: any[], schema: object) => {
    const apiKey = getDeepseekApiKey();
    if (!apiKey) {
        throw new Error("DEEPSEEK_API_KEY environment variable not set for DeepSeek");
    }

    // Add schema instruction to the last user message
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
        // Fallback if no user message, though unlikely
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

    // Deepseek needs the response to be an object, so we wrap the array
    const responseSchema = { phrases: schema };
    const result = await callDeepSeekApi(messages, responseSchema);
    return result.phrases;
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
    
    // Deepseek needs the response to be an object, so we wrap the array
    const responseSchema = { examples: schema };
    const result = await callDeepSeekApi(messages, responseSchema);
    return result.examples;
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
    generateInitialExamples,
    continueChat,
    generateDeepDiveAnalysis,
    generateMovieExamples,
    healthCheck,
    getProviderName: () => "DeepSeek",
};