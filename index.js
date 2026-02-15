// AI Content Generator - NO LIMITS VERSION
// Lets AI generate full, complete content

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

const CONTENT_TYPES = {
    tweet: {
        name: 'Twitter Post',
        prompt: 'Write a viral, engaging tweet about: [TOPIC]. Make it catchy and complete. Use emojis. Style: [TONE].'
    },
    instagram: {
        name: 'Instagram Caption',
        prompt: 'Write an engaging Instagram caption about: [TOPIC]. Include emojis, hashtags, and call-to-action. Style: [TONE].'
    },
    tiktok: {
        name: 'TikTok Caption',
        prompt: 'Write a TikTok caption about: [TOPIC]. Use emojis and hashtags. Style: [TONE].'
    },
    blog_intro: {
        name: 'Blog Post Introduction',
        prompt: 'Write a compelling blog introduction about: [TOPIC]. Hook the reader and preview what they will learn. Style: [TONE].'
    },
    blog_outline: {
        name: 'Blog Post Outline',
        prompt: 'Create a detailed blog outline about: [TOPIC]. Include title, sections, and conclusion. Style: [TONE].'
    },
    email_subject: {
        name: 'Email Subject Lines',
        prompt: 'Generate 5 compelling email subject lines about: [TOPIC]. Make them click-worthy. Style: [TONE].'
    },
    product_desc: {
        name: 'Product Description',
        prompt: 'Write a persuasive product description for: [TOPIC]. Highlight benefits and features. Style: [TONE].'
    },
    ad_copy: {
        name: 'Ad Copy',
        prompt: 'Write compelling ad copy for: [TOPIC]. Focus on benefits and call-to-action. Style: [TONE].'
    },
    thread: {
        name: 'Twitter Thread',
        prompt: 'Create a Twitter thread about: [TOPIC]. Make each tweet engaging. Style: [TONE].'
    },
    linkedin: {
        name: 'LinkedIn Post',
        prompt: 'Write a professional LinkedIn post about: [TOPIC]. Share insights and value. Style: [TONE].'
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
        version: 'unlimited',
        available_types: Object.keys(CONTENT_TYPES),
        available_tones: Object.keys(TONES)
    });
});

// Helper to wait between retries
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

        const prompt = CONTENT_TYPES[contentType].prompt
            .replace('[TOPIC]', topic)
            .replace('[TONE]', TONES[tone] || tone);

        console.log('Generating:', contentType, 'for:', topic);

        // Retry up to 3 times if rate limited
        let maxRetries = 3;
        let attempt = 0;
        let response;

        while (attempt < maxRetries) {
            response = await fetch(
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
                            maxOutputTokens: 2048
                        }
                    })
                }
            );

            // Handle rate limit (429)
            if (response.status === 429) {
                attempt++;
                console.log('Rate limited, waiting... attempt', attempt);
                if (attempt < maxRetries) {
                    await sleep(3000); // Wait 3 seconds
                    continue;
                } else {
                    return res.status(429).json({ 
                        error: 'Too many requests. Please wait 30 seconds and try again.' 
                    });
                }
            }

            // Other errors
            if (!response.ok) {
                console.error('AI error:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                return res.status(500).json({ error: 'AI generation failed' });
            }

            // Success - break out of retry loop
            break;
        }

        const data = await response.json();
        
        // Check if we got content
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('No content in response:', data);
            return res.status(500).json({ error: 'No content generated' });
        }

        let content = data.candidates[0].content.parts[0].text;
        content = content.trim();

        console.log('Generated successfully:', content.length, 'characters');

        res.json({
            success: true,
            content: content,
            contentType: contentType,
            topic: topic,
            tone: tone,
            length: content.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Server error:', error);
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
    console.log('AI Content Generator (Unlimited) running on port', PORT);
    console.log('Max tokens: 2048 - Full content generation enabled');
});
