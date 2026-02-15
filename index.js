// AI Content Generator Backend - Simple Fix
// Just tells AI to finish sentences, minimal post-processing

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

const CONTENT_TYPES = {
    tweet: {
        name: 'Twitter Post',
        prompt: 'Write a complete viral tweet about: [TOPIC]. IMPORTANT: Must be under 270 characters total. Use emojis and make it engaging. End with a complete sentence - no cutting off mid-word. Style: [TONE].'
    },
    instagram: {
        name: 'Instagram Caption',
        prompt: 'Write an engaging Instagram caption about: [TOPIC]. Include emojis, 5-10 hashtags at end, and call-to-action. Style: [TONE].'
    },
    tiktok: {
        name: 'TikTok Caption',
        prompt: 'Write a short TikTok caption about: [TOPIC]. Use emojis and 3-5 hashtags. Keep it under 150 characters. Style: [TONE].'
    },
    blog_intro: {
        name: 'Blog Post Introduction',
        prompt: 'Write a compelling blog introduction (2-3 paragraphs) about: [TOPIC]. Hook reader, explain why it matters, preview what they will learn. Style: [TONE].'
    },
    blog_outline: {
        name: 'Blog Post Outline',
        prompt: 'Create a detailed blog outline about: [TOPIC]. Include title, intro hook, 5-7 main sections with subpoints, and conclusion. Style: [TONE].'
    },
    email_subject: {
        name: 'Email Subject Lines',
        prompt: 'Generate 5 email subject lines about: [TOPIC]. Each under 60 characters. Make them click-worthy. Number them 1-5. Style: [TONE].'
    },
    product_desc: {
        name: 'Product Description',
        prompt: 'Write a persuasive product description for: [TOPIC]. Highlight benefits, features, why buy. Include emotional appeal and call-to-action. Style: [TONE].'
    },
    ad_copy: {
        name: 'Ad Copy',
        prompt: 'Write compelling ad copy (headline plus 2-3 sentences) for: [TOPIC]. Focus on benefits, urgency, strong call-to-action. Style: [TONE].'
    },
    thread: {
        name: 'Twitter Thread',
        prompt: 'Create a Twitter thread (5-7 tweets) about: [TOPIC]. Each tweet under 270 characters. Number them. First hooks, middle provides value, last has CTA. Style: [TONE].'
    },
    linkedin: {
        name: 'LinkedIn Post',
        prompt: 'Write a professional LinkedIn post about: [TOPIC]. Share insights or story. Include hook, body, call-to-action. Use paragraph breaks. Style: [TONE].'
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
        available_types: Object.keys(CONTENT_TYPES),
        available_tones: Object.keys(TONES)
    });
});

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

        const prompt = CONTENT_TYPES[contentType].prompt
            .replace('[TOPIC]', topic)
            .replace('[TONE]', TONES[tone] || tone);

        console.log('Generating:', contentType);

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
                        maxOutputTokens: 800
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('AI error:', response.status);
            return res.status(500).json({ error: 'AI generation failed' });
        }

        const data = await response.json();
        let content = data.candidates[0].content.parts[0].text;
        
        // Just trim whitespace, don't cut anything
        content = content.trim();

        console.log('Generated:', content.length, 'characters');

        res.json({
            success: true,
            content: content,
            contentType: contentType,
            topic: topic,
            tone: tone,
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
            name: CONTENT_TYPES[key].name
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
    console.log('AI Content Generator running on port', PORT);
});
