import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Call Anthropic API directly
async function callClaude(systemPrompt, userMessage) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMessage }],
        system: systemPrompt,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

// POST - Analyze detailer's website and suggest questions
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return Response.json({ error: 'Website URL required' }, { status: 400 });
    }

    // Fetch website content
    let websiteContent = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VectorBot/1.0)',
        },
      });

      if (!response.ok) {
        return Response.json({ error: 'Could not access website' }, { status: 400 });
      }

      const html = await response.text();

      // Extract text content (simple HTML stripping)
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000); // Limit content

    } catch (err) {
      return Response.json({ error: 'Failed to fetch website: ' + err.message }, { status: 400 });
    }

    // Try to use Claude for analysis
    const aiResponse = await callClaude(
      'You analyze aircraft detailing websites to suggest intake questions.',
      `You are analyzing an aircraft detailing company's website to suggest intake questions for their lead form.

Website content:
${websiteContent}

Based on the services and information on this website, suggest 3-5 relevant intake questions that would help qualify leads. Focus on:
1. Services they offer (ceramic coating, paint correction, etc.)
2. Aircraft types they specialize in
3. Unique offerings or specializations

Return JSON array with objects containing:
- question: The question to ask customers
- reason: Why this question is relevant (based on their services)
- key: A short snake_case identifier

Example:
[
  {
    "question": "Are you interested in our ceramic coating protection?",
    "reason": "We noticed you offer ceramic coating services",
    "key": "ceramic_interest"
  }
]

Return ONLY the JSON array, no other text.`
    );

    if (aiResponse) {
      try {
        const suggestions = JSON.parse(aiResponse);
        return Response.json({
          success: true,
          suggestions,
          analyzed: true,
        });
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Return mock suggestions if AI not available
    return Response.json({
      success: true,
      suggestions: [
        {
          question: 'What is the size of your aircraft?',
          reason: 'Helps determine pricing and time needed',
          key: 'aircraft_size',
        },
        {
          question: 'Is your aircraft hangared or on the ramp?',
          reason: 'Affects scheduling and preparation',
          key: 'hangar_status',
        },
      ],
      analyzed: false,
    });

  } catch (err) {
    console.error('Website analysis error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
