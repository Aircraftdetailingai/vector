import { getAuthUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function callClaude(systemPrompt, userMessage, maxTokens = 4096) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('Claude API error:', err);
    return null;
  }
  const data = await response.json();
  return data.content?.[0]?.text || null;
}

async function searchWeb(query) {
  try {
    // Use Brave Search API if available, otherwise use a simple Google-like search
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: { 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        return (data.web?.results || []).map(r => ({
          title: r.title,
          description: r.description,
          url: r.url,
        }));
      }
    }
    // Fallback: use Claude to synthesize what it knows
    return null;
  } catch (err) {
    console.error('Web search error:', err);
    return null;
  }
}

async function fetchWebsite(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VectorBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_type,
      services_offered,
      company_name,
      contact_name,
      contact_title,
      website_url,
      linkedin_url,
      location,
    } = body;

    if (!customer_type) {
      return Response.json({ error: 'Customer type is required' }, { status: 400 });
    }

    // Gather research if company_name provided
    let researchData = {};

    if (company_name) {
      // Search for company info
      const [companyResults, newsResults, fleetResults] = await Promise.all([
        searchWeb(`${company_name} aviation private jet company`),
        searchWeb(`${company_name} aviation news 2025 2026`),
        searchWeb(`${company_name} fleet aircraft types`),
      ]);

      researchData.companySearch = companyResults;
      researchData.newsSearch = newsResults;
      researchData.fleetSearch = fleetResults;

      // Fetch website if provided
      if (website_url) {
        const siteContent = await fetchWebsite(website_url);
        if (siteContent) {
          researchData.websiteContent = siteContent;
        }
      }

      // If no web search API, use Claude's knowledge as research
      if (!companyResults) {
        const knowledgePrompt = `You are a research assistant for an aircraft detailing sales professional.

Provide a detailed research brief on "${company_name}" as an aviation company. Include:
1. What type of company they are (charter, fractional, FBO, corporate flight dept, etc.)
2. What aircraft they're known to operate (be specific with models)
3. Their approximate fleet size
4. Key locations/bases
5. Recent notable developments or news
6. Company positioning (luxury, value, etc.)
7. Key decision makers and org structure (if well-known company)

${contact_name ? `Also research what you know about the role of "${contact_title || 'executive'}" at this type of company and what they'd care about.` : ''}
${location ? `They are based at or near: ${location}` : ''}

Be factual. If you're not sure about something, say so. Do NOT make up specific numbers or names you're not confident about.`;

        const knowledgeResponse = await callClaude(
          'You are an aviation industry research assistant.',
          knowledgePrompt,
          1500,
        );
        if (knowledgeResponse) {
          researchData.aiKnowledge = knowledgeResponse;
        }
      }
    }

    // Build the generation prompt
    const researchSection = company_name ? `
## PROSPECT RESEARCH
Company: ${company_name}
${contact_name ? `Contact: ${contact_name}` : ''}
${contact_title ? `Title: ${contact_title}` : ''}
${location ? `Location: ${location}` : ''}
${website_url ? `Website: ${website_url}` : ''}
${linkedin_url ? `LinkedIn: ${linkedin_url}` : ''}

${researchData.aiKnowledge ? `### AI Knowledge Brief:\n${researchData.aiKnowledge}` : ''}
${researchData.companySearch ? `### Web Search Results - Company:\n${researchData.companySearch.map(r => `- ${r.title}: ${r.description}`).join('\n')}` : ''}
${researchData.newsSearch ? `### Web Search Results - News:\n${researchData.newsSearch.map(r => `- ${r.title}: ${r.description}`).join('\n')}` : ''}
${researchData.fleetSearch ? `### Web Search Results - Fleet:\n${researchData.fleetSearch.map(r => `- ${r.title}: ${r.description}`).join('\n')}` : ''}
${researchData.websiteContent ? `### Website Content (excerpts):\n${researchData.websiteContent.slice(0, 4000)}` : ''}
` : '';

    const systemPrompt = `You are an elite aviation sales coach helping aircraft detailers close high-value contracts. You create personalized, research-backed sales scripts.

${company_name ? `You have researched this specific prospect. Use the following intel to create highly personalized scripts that reference their specific aircraft, recent news, company size, and challenges. Make it clear you've done your homework - mention specific details that show you understand their operation. Do not make up facts - only use information from the research provided.` : ''}

Your scripts should be:
- Professional but conversational (not salesy or pushy)
- Specific to aviation detailing (mention aircraft types, coatings, paint protection)
- Reference real pain points for the customer type
- Include specific dollar amounts and timeframes where possible
- Sound like an experienced detailer who knows the business`;

    const userMessage = `Generate sales scripts for an aircraft detailer targeting: ${customer_type}

${services_offered ? `Services I offer: ${services_offered}` : 'Services: Full exterior/interior detail, ceramic coating, paint correction, brightwork polishing'}

${researchSection}

Return your response in this exact JSON format:
{
  "research_summary": "${company_name ? 'A 2-3 paragraph summary of what you found about this prospect, their fleet, recent news, and key insights for the sales approach.' : 'null'}",
  "scripts": [
    {
      "title": "Script name",
      "type": "cold_call | email | linkedin | follow_up | objection_handler",
      "content": "The full script text with [BRACKETS] for personalization points",
      "tips": "Quick tips for delivering this script"
    }
  ]
}

Generate these scripts:
1. ${company_name ? `Personalized cold call opening referencing ${company_name}'s specific aircraft and recent news` : 'Cold call introduction'}
2. ${company_name ? `Personalized email to ${contact_name || 'decision maker'} at ${company_name}` : 'Initial outreach email'}
3. ${company_name ? `LinkedIn message to ${contact_name || 'the contact'} that references their company` : 'LinkedIn connection message'}
4. Follow-up script (after no response)
5. ${company_name ? `Objection handler specific to ${customer_type} concerns` : 'Common objection responses'}

Return ONLY valid JSON, no other text.`;

    const aiResponse = await callClaude(systemPrompt, userMessage);

    if (!aiResponse) {
      return Response.json({ error: 'AI generation failed. Check your Anthropic API key.' }, { status: 500 });
    }

    // Parse the AI response
    let parsed;
    try {
      // Handle potential markdown code blocks
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response:', e, aiResponse.slice(0, 500));
      return Response.json({
        research_summary: null,
        scripts: [{
          title: 'Generated Script',
          type: 'general',
          content: aiResponse,
          tips: '',
        }],
      });
    }

    // Save to database
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('sales_scripts').insert({
          detailer_id: user.id,
          customer_type,
          company_name: company_name || null,
          contact_name: contact_name || null,
          contact_title: contact_title || null,
          research_summary: parsed.research_summary || null,
          scripts: parsed.scripts,
        });
      } catch (err) {
        console.error('Failed to save scripts:', err);
        // Non-fatal - still return the scripts
      }
    }

    return Response.json({
      research_summary: parsed.research_summary || null,
      scripts: parsed.scripts || [],
    });

  } catch (err) {
    console.error('Sales assistant error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
