import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { nationality, destination } = await req.json();

    if (!nationality || !destination) {
      return NextResponse.json({ error: 'Missing nationality or destination' }, { status: 400 });
    }

    const nat = nationality.toLowerCase().trim();
    const dest = destination.toLowerCase().trim();

    // Catch domestic Indian travel requests
    const isIndianNat = nat.includes('india') || nat === 'indian';
    const isIndianDest = dest.includes('india') || 
                         dest === 'goa' || 
                         dest === 'mumbai' || 
                         dest === 'delhi' || 
                         dest === 'jaipur' || 
                         dest === 'bengaluru' || 
                         dest === 'bangalore' || 
                         dest === 'manali' || 
                         dest === 'assam' || 
                         dest === 'guwahati' ||
                         dest === 'rajasthan' ||
                         dest === 'kerala' ||
                         dest === 'ladakh';

    if (isIndianNat && isIndianDest) {
      console.log(`[TripEvo Visa] Domestic travel detected for: ${nationality} -> ${destination}`);
      return NextResponse.json({
        status: 'Domestic Travel',
        description: `No visa or passport is required for Indian citizens traveling domestically within India. Ensure you carry a standard government photo ID (e.g., Aadhaar, PAN card, or Voter ID).`,
        link: 'https://www.incredibleindia.org'
      });
    }

    console.log(`[TripEvo Visa] Querying Groq for visa rules: ${nationality} -> ${destination}`);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a strict, factual international travel visa advisor. 
The user will provide their nationality/passport country and the destination country.
You must output a JSON object containing exactly these fields:
1. "status": A short summary (e.g. "Visa on Arrival (VoA)", "E-Visa Required", "Visa-Free (30 Days)", "Pre-approved Visa Required").
2. "description": A 1-2 sentence detailed explanation of the rules, maximum stay, and requirements. Be factually accurate. Do NOT make up information. Citizens of Pakistan cannot enter India visa-free. Do not confuse nationality rules.
3. "link": The exact URL to the official government embassy or e-visa portal for that specific destination.

Output ONLY raw valid JSON, no markdown formatting blocks.`,
        },
        {
          role: 'user',
          content: `Nationality/Passport: ${nationality}\nDestination: ${destination}`,
        },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq');
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Groq API Error:', error);
    return NextResponse.json({ error: 'Failed to verify visa requirements' }, { status: 500 });
  }
}
