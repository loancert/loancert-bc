export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system } = req.body;

  if (!messages || !system) {
    return res.status(400).json({ error: "Missing messages or system prompt" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error("[LoanCert] Anthropic error:", rawText);
      return res.status(response.status).json({ error: rawText });
    }

    const data = JSON.parse(rawText);
    return res.status(200).json(data);

  } catch (error) {
    console.error("[LoanCert] Handler error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
