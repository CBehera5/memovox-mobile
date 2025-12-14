// Quick test to verify Groq API key works
const Groq = require('groq-sdk').default;

const apiKey = '***REMOVED***';

console.log('Testing Groq API...');
console.log('API Key:', apiKey.substring(0, 10) + '...');

const groqClient = new Groq({
  apiKey: apiKey,
});

console.log('Groq client created successfully');

async function testChat() {
  try {
    console.log('Sending test message...');
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: 'Say hello in one sentence.',
        },
      ],
    });

    console.log('✅ SUCCESS! Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testChat();
