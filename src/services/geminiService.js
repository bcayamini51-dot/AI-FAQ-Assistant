const { GoogleGenAI } = require('@google/genai');

// Initialize the GoogleGenAI client
// If the key is not found, we will log a warning, but won't crash until a request is made.
const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.');
  }
  return new GoogleGenAI({ apiKey });
};

const getGeminiErrorMessage = (error) => {
  const message = error.message || String(error);
  if (error.status === 401 || /ACCESS_TOKEN_TYPE_UNSUPPORTED|UNAUTHENTICATED|invalid authentication credentials/i.test(message)) {
    return 'Gemini authentication failed. Set GEMINI_API_KEY to a valid API key from Google AI Studio, not an OAuth access token, then restart the server.';
  }
  return message;
};

/**
 * Generates a concise answer for a user's question.
 * @param {string} question 
 * @returns {Promise<string>}
 */
const generateAnswer = async (question) => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `You are a helpful assistant. Provide a clear, concise, and direct answer to the following question. Do not include introductory text like "Sure, here is the answer" or markdown formatting. Just return the answer itself.

Question: ${question}`,
    });

    if (!response || !response.text) {
      throw new Error('No response text received from Gemini API');
    }

    return response.text.trim();
  } catch (error) {
    console.error('Error in geminiService.generateAnswer:', error);
    throw new Error(`AI Answer Generation failed: ${getGeminiErrorMessage(error)}`);
  }
};

/**
 * Generates a single FAQ question and answer pair for a topic.
 * @param {string} topic 
 * @returns {Promise<{question: string, answer: string}>}
 */
const generateFAQ = async (topic) => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Generate a single frequently asked question (FAQ) and its comprehensive answer regarding the topic: "${topic}".`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            question: { 
              type: 'STRING', 
              description: 'A clear, common question that a user would ask about the topic.' 
            },
            answer: { 
              type: 'STRING', 
              description: 'A detailed, helpful, and accurate answer explaining the question.' 
            }
          },
          required: ['question', 'answer'],
        },
      },
    });

    if (!response || !response.text) {
      throw new Error('No response received from Gemini API');
    }

    // Parse the structured JSON response
    const faqPair = JSON.parse(response.text);
    return faqPair;
  } catch (error) {
    console.error('Error in geminiService.generateFAQ:', error);
    throw new Error(`AI FAQ Generation failed: ${getGeminiErrorMessage(error)}`);
  }
};

module.exports = {
  generateAnswer,
  generateFAQ,
};
