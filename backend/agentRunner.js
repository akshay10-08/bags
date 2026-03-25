import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const client = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder_key' 
});

/**
 * Runs an Anthropic Claude agent matching the CONVICTION_DOCS.md Section 13 spec.
 * gracefully catches errors, forces JSON output, and uses fallback.
 */
export async function runAgent(agentName, systemPrompt, tokenData) {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyse this token and return your assessment as JSON:
          ${JSON.stringify(tokenData, null, 2)}
          
          Return ONLY valid JSON in this exact format:
          {
            "agentName": "${agentName}",
            "score": <number 0-1>,
            "confidence": <number 0-1>,
            "reasons": [<3-5 plain English strings>],
            "flag": "<pass|warn|block>"
          }`
        }
      ]
    });

    const raw = message.content[0].text;
    
    // Robust JSON parsing to handle markdown blocks safely
    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         parsed = JSON.parse(jsonMatch[0]);
      } else {
         parsed = JSON.parse(raw); // attempt direct parse
      }
    } catch (parseError) {
      console.error(`[${agentName}] JSON parsing failed. String: ${raw}`);
      throw new Error("Malformed JSON response from Agent");
    }

    console.log(`[${agentName}] score: ${parsed.score} | flag: ${parsed.flag}`);
    return parsed;

  } catch (error) {
    console.error(`[${agentName}] failed:`, error.message);
    
    // Fallback exactly as specified in the docs requirement
    return {
      agentName,
      score: 0.5,
      confidence: 0.1,
      reasons: ['Agent failed to run — defaulting to neutral score'],
      flag: 'warn'
    };
  }
}
