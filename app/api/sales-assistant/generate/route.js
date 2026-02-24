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

// Detect airport codes (ICAO 4-letter starting with K, or IATA 3-letter)
function detectAirportCode(text) {
  if (!text) return null;
  const icao = text.match(/\b(K[A-Z]{3})\b/);
  if (icao) return icao[1];
  const iata = text.match(/\b([A-Z]{3})\b/);
  if (iata) return iata[1];
  return null;
}

// Script templates per contact type
const CONTACT_TYPE_SCRIPTS = {
  cold_walkin: {
    scripts: [
      { title: '15-Second Opening', type: 'cold_walkin', desc: 'Quick opening since they\'re busy - get to the point fast' },
      { title: 'Ask for the Right Person', type: 'gatekeeper', desc: 'How to find and get to the decision maker' },
      { title: 'Leave-Behind Strategy', type: 'leave_behind', desc: '"Can I leave my card?" and what to leave with them' },
      { title: 'Follow-Up Email (Same Day)', type: 'email', desc: 'Send within 2 hours of the walk-in' },
      { title: 'Handle "We Already Have Someone"', type: 'objection_handler', desc: 'The most common walk-in objection' },
    ],
  },
  cold_call: {
    scripts: [
      { title: 'Opening Hook (Pattern Interrupt)', type: 'cold_call', desc: 'First 10 seconds to stop them from hanging up' },
      { title: 'Gatekeeper Script', type: 'gatekeeper', desc: 'Getting past the front desk to the decision maker' },
      { title: 'Voicemail Script', type: 'voicemail', desc: '30-second voicemail that gets callbacks' },
      { title: 'Follow-Up Email After Call', type: 'email', desc: 'Send immediately after hanging up' },
      { title: 'Follow-Up Sequence (No Response)', type: 'follow_up', desc: '3-touch follow-up cadence over 2 weeks' },
    ],
  },
  warm_lead: {
    scripts: [
      { title: 'Reference How They Found You', type: 'cold_call', desc: 'Open by acknowledging the connection' },
      { title: 'Discovery Questions', type: 'discovery', desc: 'Questions to understand their fleet, needs, and timeline' },
      { title: 'Proposal Talking Points', type: 'proposal', desc: 'Key points to hit when discussing pricing and scope' },
      { title: 'Email to Confirm Interest', type: 'email', desc: 'Professional email after initial conversation' },
      { title: 'Handle "Send Me a Quote"', type: 'objection_handler', desc: 'When they try to skip the conversation' },
    ],
  },
  follow_up: {
    scripts: [
      { title: 'Recap Previous Conversation', type: 'follow_up', desc: 'Reference what you discussed and their needs' },
      { title: 'Address Concerns Raised', type: 'objection_handler', desc: 'Tackle the specific objections they mentioned' },
      { title: 'Propose Next Steps', type: 'proposal', desc: 'Clear call-to-action to move forward' },
      { title: 'Urgency Creator', type: 'follow_up', desc: 'Legitimate reasons to act now (seasonal, scheduling)' },
      { title: '"Checking In" Email', type: 'email', desc: 'Low-pressure follow-up that adds value' },
    ],
  },
  trade_show: {
    scripts: [
      { title: 'Booth Introduction', type: 'cold_walkin', desc: 'Quick pitch when they walk by your booth' },
      { title: 'Post-Event Follow-Up Email', type: 'email', desc: 'Same-day or next-day email after meeting' },
      { title: 'LinkedIn Connection Message', type: 'linkedin', desc: 'Connect with the reference to where you met' },
      { title: 'Schedule a Call Script', type: 'cold_call', desc: 'Getting from "nice to meet you" to a real conversation' },
      { title: 'Handle "We\'ll Think About It"', type: 'objection_handler', desc: 'The polite trade show brush-off' },
    ],
  },
};

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_type,
      contact_type,
      notes,
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
    if (!contact_type) {
      return Response.json({ error: 'Contact type is required' }, { status: 400 });
    }

    // Gather research if company_name provided
    let researchData = {};

    if (company_name) {
      const searchPromises = [
        searchWeb(`${company_name} aviation private jet company`),
        searchWeb(`${company_name} aviation news 2025 2026`),
        searchWeb(`${company_name} fleet aircraft types`),
      ];

      // Detect airport code and search for airport info
      const airportCode = detectAirportCode(location) || detectAirportCode(company_name);
      if (airportCode) {
        searchPromises.push(searchWeb(`${airportCode} airport FBO private aviation`));
      }

      const results = await Promise.all(searchPromises);
      researchData.companySearch = results[0];
      researchData.newsSearch = results[1];
      researchData.fleetSearch = results[2];
      if (airportCode) {
        researchData.airportSearch = results[3];
        researchData.airportCode = airportCode;
      }

      // Fetch website if provided
      if (website_url) {
        const siteContent = await fetchWebsite(website_url);
        if (siteContent) {
          researchData.websiteContent = siteContent;
        }
      }

      // If no web search API, use Claude's knowledge
      if (!researchData.companySearch) {
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
${airportCode ? `Research this airport as well: ${airportCode} - what FBOs operate there, what types of aircraft are common, runway info.` : ''}

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

    // Get the script template for this contact type
    const scriptTemplate = CONTACT_TYPE_SCRIPTS[contact_type] || CONTACT_TYPE_SCRIPTS.cold_call;

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
${researchData.airportSearch ? `### Airport / FBO Search:\n${researchData.airportSearch.map(r => `- ${r.title}: ${r.description}`).join('\n')}` : ''}
${researchData.websiteContent ? `### Website Content (excerpts):\n${researchData.websiteContent.slice(0, 4000)}` : ''}
` : '';

    const contactTypeInstructions = {
      cold_walkin: `The detailer is doing a COLD WALK-IN at an FBO or hangar. They have NO appointment. Scripts must be:
- Ultra concise (15 seconds max for the opener - they'll get kicked out if they waste time)
- Focused on finding the right person fast
- Include a leave-behind strategy (business card + one-page flyer talking points)
- Assume the front desk person is NOT the decision maker
- Include how to handle "you need to leave" gracefully`,

      cold_call: `The detailer is making a COLD CALL. Scripts must include:
- A pattern interrupt opening (first 10 seconds are everything)
- A gatekeeper bypass script (receptionists/assistants)
- A voicemail script (30 seconds max, reason to call back)
- Assume they'll need 5-7 touches before getting through
- Include a multi-day follow-up sequence`,

      warm_lead: `This is a WARM LEAD - they either reached out first, were referred, or showed interest. Scripts should:
- Reference the warm connection immediately
- Ask discovery questions (fleet size, current provider, pain points, timeline)
- NOT be pushy - they're already interested, don't scare them off
- Focus on understanding their specific needs before pitching
- Include proposal talking points for when they're ready`,

      follow_up: `This is a FOLLOW-UP to a previous conversation. Scripts should:
- Open by recapping what was discussed before
- Address specific concerns or objections they raised
- Propose clear next steps with a timeline
- Create legitimate urgency (seasonal schedules, availability windows)
- Have a "checking in" option that adds value instead of just asking for business`,

      trade_show: `The detailer met this prospect at a TRADE SHOW or aviation event (NBAA, MRO Americas, HELI-EXPO, etc.). Scripts should:
- Reference the specific event and booth/conversation
- Be timely (same day or next day follow-up)
- Include a LinkedIn connection message referencing the event
- Move quickly from "nice to meet you" to scheduling a real conversation
- Stand out from the 50 other follow-ups they'll get`,
    };

    const systemPrompt = `You are an elite aviation sales coach helping aircraft detailers close high-value contracts. You create personalized, research-backed sales scripts.

${company_name ? `You have researched this specific prospect. Use the research intel to create highly personalized scripts that reference their specific aircraft, recent news, company size, and challenges. Make it clear you've done your homework - mention specific details. Do not make up facts - only use information from the research provided.` : ''}

CONTACT TYPE CONTEXT:
${contactTypeInstructions[contact_type] || contactTypeInstructions.cold_call}

Your scripts should be:
- Professional but conversational (not salesy or pushy)
- Specific to aviation detailing (mention aircraft types, coatings, paint protection, ceramic, brightwork)
- Reference real pain points for the customer type
- Include specific dollar amounts and timeframes where appropriate
- Sound like an experienced detailer who knows the business
- Adapted specifically to the contact type scenario`;

    const scriptList = scriptTemplate.scripts.map((s, i) =>
      `${i + 1}. "${s.title}" (type: "${s.type}") - ${s.desc}`
    ).join('\n');

    const companyIntelRequest = company_name ? `
ALSO: Before the scripts, provide a structured "company_intel" object with these fields (use only facts from the research, leave fields null if you don't have solid info):
- "fleet": specific aircraft models and counts if known (string)
- "locations": airports/bases where they operate (string)
- "recent_news": most notable recent development (string)
- "decision_maker": likely job title of who buys detailing (string)
- "opportunity_score": 1-10 rating of how good this prospect is for an aircraft detailer (integer)
- "airport_info": if airport data available, summarize runway info, FBOs, common aircraft types (string or null)
- "summary": 2-3 paragraph full research summary with sales approach recommendations (string)
` : '';

    const userMessage = `Generate sales scripts for an aircraft detailer.

Customer Type: ${customer_type}
Contact Type: ${contact_type}
${notes ? `\nDetailer's Notes:\n${notes}` : ''}

${researchSection}

${companyIntelRequest}

Return your response in this exact JSON format:
{
  ${company_name ? `"company_intel": {
    "fleet": "string or null",
    "locations": "string or null",
    "recent_news": "string or null",
    "decision_maker": "string or null",
    "opportunity_score": number_1_to_10,
    "airport_info": "string or null",
    "summary": "string"
  },` : ''}
  "scripts": [
    {
      "title": "Script name",
      "type": "script_type_tag",
      "content": "The full script text with [BRACKETS] for personalization points",
      "tips": "Quick tips for delivering this script effectively"
    }
  ]
}

Generate these specific scripts (in this order):
${scriptList}

Return ONLY valid JSON, no other text.`;

    const aiResponse = await callClaude(systemPrompt, userMessage);

    if (!aiResponse) {
      return Response.json({ error: 'AI generation failed. Check your Anthropic API key.' }, { status: 500 });
    }

    // Parse the AI response
    let parsed;
    try {
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response:', e, aiResponse.slice(0, 500));
      return Response.json({
        company_intel: null,
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
          research_summary: parsed.company_intel?.summary || null,
          scripts: parsed.scripts,
        });
      } catch (err) {
        console.error('Failed to save scripts:', err);
      }
    }

    return Response.json({
      company_intel: parsed.company_intel || null,
      scripts: parsed.scripts || [],
    });

  } catch (err) {
    console.error('Sales assistant error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
