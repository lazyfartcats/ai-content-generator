// AI Content Generator Backend - FIXED VERSION
// Never cuts off mid-sentence, respects character limits

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

// Content type templates with strict length requirements
const CONTENT_TYPES = {
    tweet: {
        name: 'Twitter Post',
        prompt: 'Write a complete, viral tweet (MUST be 250 characters or less) about: [TOPIC]. Make it catchy, use relevant emojis, include a call-to-action. CRITICAL: End with a complete sentence. Do not cut off mid-word or mid-sentence. Style: [TONE].',
        maxLength: 280
    },
    instagram: {
        name: 'Instagram Caption',
        prompt: 'Write an engaging Instagram caption about: [TOPIC]. Include relevant emojis, 5-10 hashtags at the end, and a call-to-action. Make it authentic. IMPORTANT: Always finish with complete sentences. Style: [TONE].',
        maxLength: 2200
    },
    tiktok: {
        name: 'TikTok Caption',
        prompt: 'Write a short, punchy TikTok caption (max 150 characters) about: [TOPIC]. Use trending language, emojis, 3-5 hashtags. MUST end with a complete thought. Style: [TONE].',
        maxLength: 150
    },
    blog_intro: {
        name: 'Blog Post Introduction',
        prompt: 'Write a compelling blog post introduction (2-3 complete paragraphs) about: [TOPIC]. Hook the reader, explain why this matters, preview what they will learn. End naturally. Style: [TONE].',
        maxLength: 1500
    },
    blog_outline: {
        name: 'Blog Post Outline',
        prompt: 'Create a detailed blog post outline about: [TOPIC]. Include: catchy title, introduction hook, 5-7 main sections with subpoints, and conclusion. Make it SEO-friendly. Style: [TONE].',
        maxLength: 2000
    },
    email_subject: {
        name: 'Email Subject Lines',
        prompt: 'Generate exactly 5 compelling email subject lines about: [TOPIC]. Each under 60 characters. Make them click-worthy, create curiosity. Include variety. Number them 1-5. Style: [TONE].',
        maxLength: 500
    },
    product_desc: {
        name: 'Product Description',
        prompt: 'Write a persuasive product description (3-4 complete sentences) for: [TOPIC]. Highlight benefits, features, why someone should buy. Include emotional appeal and clear call-to-action. Style: [TONE].',
        maxLength: 1000
    },
    ad_copy: {
        name: 'Ad Copy',
        prompt: 'Write compelling ad copy (one headline + 2-3 complete sentences) for: [TOPIC]. Focus on benefits, create urgency, strong call-to-action. MUST end naturally. Style: [TONE].',
        maxLength: 500
    },
    thread: {
        name: 'Twitter Thread',
        prompt: 'Create a Twitter thread (5-7 tweets) about: [TOPIC]. Each tweet MUST be under 250 characters and end with a complete sentence. Number them (1/7, 2/7, etc). First tweet hooks, middle tweets provide value, last tweet has CTA. Style: [TONE].',
        maxLength: 2000
    },
    linkedin: {
        name: 'LinkedIn Post',
        prompt: 'Write a professional LinkedIn post (4-6 complete sentences) about: [TOPIC]. Share insights, tell a story, provide value. Include hook, body, and call-to-action. Use paragraph breaks. End naturally. Style: [TONE].',
        maxLength: 1500
    }
};

const TONES = {
    professional: 'Professional, polished, business-appropriate',
    casual: 'Casual, friendly, conversational',
    funny: 'Humorous, witty, entertaining',
    inspiring: 'Motivational, uplifting, empowering',
    educational: 'Informative, clear, teaching-focused',
    sales: 'Persuasive, benefit-focused, conversion-driven',
    storytelling: 'Narrative, engaging, personal'
};

app.get('/', (req, res) => {
    res.json({
        service: 'AI Content Generator API',
        status: 'running',
        version: '2.0',
        available_types: Object.keys(CONTENT_TYPES),
        available_tones: Object.keys(TONES)
    });
});

// Helper function to ensure content ends properly
function cleanContent(content, maxLength) {
    // Trim whitespace
    content = content.trim();
    
    // If content is too long, truncate at last complete sentence
    if (content.length > maxLength) {
        // Find the last period, exclamation, or question mark before maxLength
        const truncated = content.substring(0, maxLength);
        const lastSentenceEnd = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf('!'),
            truncated.lastIndexOf('?')
        );
        
        if (lastSentenceEnd > 0) {
            content = content.substring(0, lastSentenceEnd + 1).trim();
        }
    }
    
    // Remove incomplete sentences at the end
    if (!content.endsWith('.') && !content.endsWith('!') && !content.endsWith('?')) {
        const lastSentenceEnd = Math.max(
            content.lastIndexOf('.'),
            content.lastIndexOf('!'),
            content.lastIndexOf('?')
        );
        
        if (lastSentenceEnd > 0) {
            content = content.substring(0, lastSentenceEnd + 1).trim();
        }
    }
    
    return content;
}

app.post('/generate', async (req, res) => {
    try {
        const { contentType, topic, tone = 'professional' } = req.body;

        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        if (!CONTENT_TYPES[contentType]) {
            return res.status(400).json({ error: 'Invalid content type' });
        }

        const contentConfig = CONTENT_TYPES[contentType];
        const prompt = contentConfig.prompt
            .replace('[TOPIC]', topic)
            .replace('[TONE]', TONES[tone] || tone);

        console.log('Generating:', contentType, 'for:', topic);

        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: Math.ceil(contentConfig.maxLength / 3),
                        stopSequences: []
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('AI API error:', response.status);
            return res.status(500).json({ error: 'AI generation failed' });
        }

        const data = await response.json();
        let content = data.candidates[0].content.parts[0].text;

        // Clean and ensure proper ending
        content = cleanContent(content, contentConfig.maxLength);

        console.log('Generated length:', content.length, 'Max:', contentConfig.maxLength);

        res.json({
            success: true,
            content: content,
            contentType: contentType,
            topic: topic,
            tone: tone,
            length: content.length,
            maxLength: contentConfig.maxLength,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/content-types', (req, res) => {
    res.json({
        types: Object.keys(CONTENT_TYPES).map(key => ({
            id: key,
            name: CONTENT_TYPES[key].name,
            maxLength: CONTENT_TYPES[key].maxLength
        }))
    });
});

app.get('/tones', (req, res) => {
    res.json({
        tones: Object.keys(TONES).map(key => ({
            id: key,
            description: TONES[key]
        }))
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('AI Content Generator v2.0 running on port', PORT);
    console.log('Features: Complete sentences, proper length limits');
});
