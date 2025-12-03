const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function generateCybersecurityQuestion(topic = null, questionType = null, difficulty = 'medium') {
  if (!openai) {
    return null;
  }

  const topics = [
    'phishing attacks', 'malware and viruses', 'social engineering',
    'password security', 'network security', 'encryption',
    'firewall configuration', 'SQL injection', 'XSS attacks',
    'DDoS attacks', 'ransomware', 'two-factor authentication',
    'VPN security', 'email security', 'browser security'
  ];

  if (!topic) {
    topic = topics[Math.floor(Math.random() * topics.length)];
  }

  // Only support multiple_choice and true_false
  if (!questionType) {
    questionType = ['multiple_choice', 'true_false'][Math.floor(Math.random() * 2)];
  }

  // Ensure only supported types
  if (questionType !== 'multiple_choice' && questionType !== 'true_false') {
    questionType = 'multiple_choice';
  }

  let prompt = `Generate a ${difficulty} difficulty cybersecurity question about ${topic}.\n\nQuestion type: ${questionType}\n\nRequirements:\n- Make it educational and practical\n- Focus on real-world scenarios when possible\n- Ensure the question tests understanding, not just memorization\n\n`;

  if (questionType === 'multiple_choice') {
    prompt += `Format the response as JSON with:\n{\n    "question_text": "The question text",\n    "question_type": "multiple_choice",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correct_answer": "Option A",\n    "category": "topic name",\n    "difficulty": "easy/medium/hard"\n}`;
  } else {
    prompt += `Format the response as JSON with:\n{\n    "question_text": "The statement to evaluate",\n    "question_type": "true_false",\n    "options": ["True", "False"],\n    "correct_answer": "True or False",\n    "category": "topic name",\n    "difficulty": "easy/medium/hard"\n}`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a cybersecurity education expert. Generate educational questions in JSON format only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    let content = response.choices[0].message.content.trim();

    // Extract JSON from markdown code blocks if present
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      content = content.split('```')[1].split('```')[0].trim();
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null;
  }
}

module.exports = { generateCybersecurityQuestion };

