import json
import os
from config import Config

# Lazy initialization of OpenAI client to avoid import-time errors
_client = None

def get_client():
    """Get or create OpenAI client instance"""
    global _client
    if _client is None and Config.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            _client = OpenAI(api_key=Config.OPENAI_API_KEY)
        except Exception as e:
            print(f"Warning: Could not initialize OpenAI client: {e}")
            _client = False  # Mark as failed to avoid retrying
    return _client if _client else None

def generate_cybersecurity_question(topic=None, question_type=None, difficulty='medium'):
    """
    Generate a cybersecurity question using OpenAI API
    
    Args:
        topic: Specific topic (phishing, malware, etc.) or None for random
        question_type: 'multiple_choice', 'true_false', or 'short_answer'
        difficulty: 'easy', 'medium', or 'hard'
    
    Returns:
        Dictionary with question data or None if API fails
    """
    client = get_client()
    if not client:
        return None
    
    # Default topics if none specified
    topics = [
        'phishing attacks', 'malware and viruses', 'social engineering',
        'password security', 'network security', 'encryption',
        'firewall configuration', 'SQL injection', 'XSS attacks',
        'DDoS attacks', 'ransomware', 'two-factor authentication',
        'VPN security', 'email security', 'browser security'
    ]
    
    if not topic:
        import random
        topic = random.choice(topics)
    
    if not question_type:
        import random
        question_type = random.choice(['multiple_choice', 'true_false'])
    
    # Create prompt for OpenAI
    prompt = f"""Generate a {difficulty} difficulty cybersecurity question about {topic}.
    
Question type: {question_type}

Requirements:
- Make it educational and practical
- Focus on real-world scenarios when possible
- Ensure the question tests understanding, not just memorization

"""
    
    if question_type == 'multiple_choice':
        prompt += """Format the response as JSON with:
{
    "question_text": "The question text",
    "question_type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "category": "topic name",
    "difficulty": "easy/medium/hard"
}"""
    elif question_type == 'true_false':
        prompt += """Format the response as JSON with:
{
    "question_text": "The statement to evaluate",
    "question_type": "true_false",
    "options": ["True", "False"],
    "correct_answer": "True or False",
    "category": "topic name",
    "difficulty": "easy/medium/hard"
}"""
    else:  # short_answer
        prompt += """Format the response as JSON with:
{
    "question_text": "The question text",
    "question_type": "short_answer",
    "options": null,
    "correct_answer": "The expected answer or key points",
    "category": "topic name",
    "difficulty": "easy/medium/hard"
}"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a cybersecurity education expert. Generate educational questions in JSON format only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Try to extract JSON from response
        # Sometimes the response includes markdown code blocks
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        question_data = json.loads(content)
        return question_data
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        print(f"Response content: {content}")
        return None
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return None

def generate_multiple_questions(count=5, topic=None, difficulty='medium'):
    """Generate multiple questions"""
    questions = []
    for _ in range(count):
        question = generate_cybersecurity_question(topic=topic, difficulty=difficulty)
        if question:
            questions.append(question)
    return questions

