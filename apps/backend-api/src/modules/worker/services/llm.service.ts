import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async synthesizeBio(textProfile: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const mockEnabled = process.env.LLM_MOCK_ENABLED === "true";
    if (!apiKey) {
      if (mockEnabled) {
        this.logger.warn(
          "GEMINI_API_KEY is missing; explicit mock mode is enabled.",
        );
        return this.generateMockBio();
      }
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const timeoutMs = this.positiveNumber(
      process.env.GEMINI_TIMEOUT_MS,
      60_000,
    );
    const maxRetries = this.positiveNumber(process.env.GEMINI_MAX_RETRIES, 3);
    const retryDelayMs = this.nonNegativeNumber(
      process.env.GEMINI_RETRY_DELAY_MS,
      1_000,
    );
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const prompt = `System Instruction: You are a professional music biographer. Summarize the following artist profile/press kit into a concise, engaging biography of 2-3 paragraphs. Focus on their musical style, achievements, and background. Output only the summarized biography text without any markdown formatting, commentary or introduction.

Here is the artist press kit:

${textProfile}`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Dispatching query to Gemini model ${model} (attempt ${attempt}/${maxRetries})`,
        );
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const details = await response.text();
          const error = new Error(
            `Gemini API returned ${response.status}: ${details}`,
          );
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            throw new NonRetryableLlmError(error.message);
          }
          throw error;
        }

        const data = (await response.json()) as any;
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText || typeof candidateText !== "string") {
          throw new Error("Gemini API returned no biography text");
        }
        return candidateText.trim();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Gemini attempt ${attempt} failed: ${lastError.message}`,
        );
        if (error instanceof NonRetryableLlmError || attempt >= maxRetries)
          break;
        if (retryDelayMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, attempt * retryDelayMs),
          );
        }
      }
    }

    if (mockEnabled) {
      this.logger.warn(
        `Gemini failed; explicit mock mode is enabled: ${lastError?.message}`,
      );
      return this.generateMockBio();
    }
    throw new Error(
      `Gemini biography generation failed: ${lastError?.message || "unknown error"}`,
    );
  }

  private positiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private nonNegativeNumber(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private generateMockBio(): string {
    return `The artist has captured audiences globally with their unique style and performance energy. According to their press materials, they have dedicated years to honing their craft, blending multiple genres to create a distinctive and memorable sonic experience.\n\nWith various notable projects and live shows under their belt, they continue to push boundaries and connect with listeners through emotional depth and artistic authenticity. This biography was generated via the system fallback engine.`;
  }
}

class NonRetryableLlmError extends Error {}
