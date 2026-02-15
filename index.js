// AI Content Generator Backend
// Generates tweets, captions, blog posts, and more

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY; // Google Gemini API key

// Content type templates
const CONTENT_TYPES = {
    tweet: {
        name: 'Twitter Post',
        prompt: 'Write a viral, engaging tweet (under 280 characters) about: [TOPIC]. Make it catchy, use relevant emojis, and include a call-to-action or thought-provoking question. Style: [TONE].'
    },
    instagram: {
        name: 'Instagram Caption',
        prompt: 'Write an engaging Instagram caption about: [TOPIC]. Include relevant emojis, hashtags at the end (5-10 relevant hashtags), and a call-to-action. Make it authentic and relatable. Style: [TONE].'
    },
    tiktok: {
        name: 'TikTok Caption',
        prompt: 'Write a short, punchy TikTok caption about: [TOPIC]. Use trending language, emojis, and make it shareable. Include 3-5 relevant hashtags. Style: [TONE].'
    },
    blog_intro: {
        name: 'Blog Post Introduction',
        prompt: 'Write a compelling blog post introduction (2-3 paragraphs) about: [TOPIC]. Hook the reader, explain why this matters, and preview what they will learn. Style: [TONE].'
    },
    blog_outline: {
        name: 'Blog Post Outline',
        prompt: 'Create a detailed blog post outline about: [TOPIC]. Include: catchy title, introduction hook, 5-7 main sections with subpoints, and conclusion. Make it SEO-friendly. Style: [TONE].'
    },
    email_subject: {
        name: 'Email Subject Lines',
        prompt: 'Generate 5 compelling email subject lines about: [TOPIC]. Make them click-worthy, create curiosity, and avoid spam triggers. Include variety (question, benefit, urgency). Style: [TONE].'
    },
    product_desc: {
        name: 'Product Description',
        prompt: 'Write a persuasive product description for: [TOPIC]. Highlight key benefits, features, and why someone should buy. Include emotional appeal and a clear call-to-action. Style: [TONE].'
    },
    ad_copy: {
        name: 'Ad Copy',
        prompt: 'Write compelling ad copy (headline + 2-3 sentences) for: [TOPIC]. Focus on benefits, create urgency, and include a strong call-to-action. Style: [TONE].'
    },
    thread: {
        name: 'Twitter Thread',
        prompt: 'Create a Twitter thread (5-7 tweets) about: [TOPIC]. First tweet should hook, middle tweets provide value, last tweet has CTA. Each under 280 characters. Number them. Style: [TONE].'
    },
    linkedin: {
        name: 'LinkedIn Post',
        prompt: 'Write a professional LinkedIn post about: [TOPIC]. Share insights, tell a story, or provide value. Include a hook, body, and call-to-action. Use paragraph breaks. Style: [TONE].'
    }
};

// Tone options
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

// Generate content endpoint
app.post('/generate', async (req, res) => {
    try {
        const { contentType, topic, tone = 'professional', customPrompt } = req.body;

        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Build prompt
        let prompt;
        if (customPrompt) {
            // Allow custom prompts
            prompt = customPrompt.replace('[TOPIC]', topic).replace('[TONE]', TONES[tone] || tone);
        } else if (CONTENT_TYPES[contentType]) {
            // Use predefined template
            prompt = CONTENT_TYPES[contentType].prompt
                .replace('[TOPIC]', topic)
                .replace('[TONE]', TONES[tone] || tone);
        } else {
            return res.status(400).json({ error: 'Invalid content type' });
        }

        console.log('Generating content:', { contentType, topic, tone });

        // Call AI
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
                        maxOutputTokens: 1000
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('AI API error:', response.status);
            return res.status(500).json({ error: 'AI generation failed' });
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;

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

// Get available content types
app.get('/content-types', (req, res) => {
    res.json({
        types: Object.keys(CONTENT_TYPES).map(key => ({
            id: key,
            name: CONTENT_TYPES[key].name
        }))
    });
});

// Get available tones
app.get('/tones', (req, res) => {
    res.json({
        tones: Object.keys(TONES).map(key => ({
            id: key,
            description: TONES[key]
        }))
    });
});

// Batch generation (generate multiple at once)
app.post('/generate-batch', async (req, res) => {
    try {
        const { requests } = req.body; // Array of {contentType, topic, tone}

        if (!Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({ error: 'Requests array required' });
        }

        if (requests.length > 5) {
            return res.status(400).json({ error: 'Maximum 5 requests per batch' });
        }

        const results = [];

        for (const request of requests) {
            try {
                const { contentType, topic, tone } = request;
                
                if (!CONTENT_TYPES[contentType] || !topic) {
                    results.push({ error: 'Invalid request parameters' });
                    continue;
                }

                const prompt = CONTENT_TYPES[contentType].prompt
                    .replace('[TOPIC]', topic)
                    .replace('[TONE]', TONES[tone] || TONES.professional);

                const response = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    results.push({
                        success: true,
                        content: data.candidates[0].content.parts[0].text,
                        contentType: contentType,
                        topic: topic
                    });
                } else {
                    results.push({ error: 'Generation failed' });
                }

            } catch (err) {
                results.push({ error: err.message });
            }
        }

        res.json({ results: results });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('AI Content Generator API running on port', PORT);
});
