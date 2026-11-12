import Anthropic from "@anthropic-ai/sdk";

// Automatic safety check for photo event entries. Claude looks at each
// photo before it can show on the vote page; anything it flags (or any
// photo it couldn't check) waits for staff instead.
//
// Env: ANTHROPIC_API_KEY. Without it, every entry waits for staff.

export type CheckResult = { allow: true } | { allow: false; reason: string };

const SYSTEM = `You screen photos people upload to a bar's Halloween costume contest. Each photo appears on a public voting page that guests view on their phones.

It's Halloween: expect lots of skin. Skimpy, revealing and sexy costumes are normal and fine. Your only job is to stop truly explicit photos.

Hold the photo for staff only if it shows:
- a woman's bare nipple or areola, including through sheer, mesh or see-through clothing
- genitals (any gender), or a bare anus or fully bare buttocks with nothing covering the crack
- an upskirt or crotch shot: a camera angle looking up a skirt or dress, or aimed at the crotch, even if underwear is visible
- a sex act, or someone touching genitals or breasts sexually
- a slur or hate symbol, or a name or costume caption (shown under the photo) that is sexual, a slur, or harassing someone

Allow everything else, including bikinis, lingerie, bodysuits, pasties or nipple covers, thongs and cheeky bottoms, cleavage, underboob, short skirts photographed normally, shirtless men, body paint that covers the nipples, scary masks, horror makeup, fake blood, toy weapons, drinks, and rude but non-sexual faces or gestures.

Only hold when you can actually see one of the things above, or when it's genuinely unclear whether a nipple or genitals are visible. Don't hold just because a costume is revealing.

Reply with the decision and a short reason staff can read at a glance (under 12 words).`;

const SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["allow", "hold"] },
    reason: { type: "string" },
  },
  required: ["decision", "reason"],
  additionalProperties: false,
} as const;

export function isPhotoCheckConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function checkContestPhoto(imageUrl: string, caption: { name: string; costume: string }): Promise<CheckResult> {
  if (!isPhotoCheckConfigured()) return { allow: false, reason: "Waiting for staff (automatic check is off)" };
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) return { allow: false, reason: "Couldn't load the photo to check it" };
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");

    const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            {
              type: "text",
              text: `Check this costume contest entry.\n\nName shown: ${JSON.stringify(caption.name)}\nCostume shown: ${JSON.stringify(caption.costume || "(none)")}`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return { allow: false, reason: "Automatic check declined; needs a look" };
    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") return { allow: false, reason: "Automatic check gave no answer" };
    const verdict = JSON.parse(text.text) as { decision?: string; reason?: string };
    if (verdict.decision === "allow") return { allow: true };
    return { allow: false, reason: `Flagged: ${(verdict.reason || "needs a look").slice(0, 120)}` };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) console.error("Photo check: ANTHROPIC_API_KEY was rejected");
    else if (error instanceof Anthropic.RateLimitError) console.error("Photo check: rate limited");
    else if (error instanceof Anthropic.APIError) console.error(`Photo check: API error ${error.status}`);
    else console.error("Photo check failed", error);
    return { allow: false, reason: "Automatic check failed; needs a look" };
  }
}
