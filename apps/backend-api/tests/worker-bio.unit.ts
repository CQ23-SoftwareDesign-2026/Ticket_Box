import test from "node:test";
import assert from "node:assert/strict";
import { fn } from "jest-mock";

const pdfParseModule = require("pdf-parse");

const mockGetText = fn().mockResolvedValue({
  text: "Mocked PDF press kit text contents",
});
const mockPdfParseClass = fn().mockImplementation(() => {
  return {
    getText: mockGetText,
  };
});

// Mock the exports property on the resolved module object directly
pdfParseModule.PDFParse = mockPdfParseClass;

import { LlmService } from "../src/modules/worker/services/llm.service";
import { WorkerService } from "../src/modules/worker/services/worker.service";
import { BioConsumer } from "../src/modules/worker/consumers/bio.consumer";
import { NotFoundException } from "@nestjs/common";

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

test.afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  mockPdfParseClass.mockClear();
  mockGetText.mockClear();
});

// ==========================================
// LLM SERVICE TESTS
// ==========================================

test("LlmService returns summarized bio from Gemini API on success", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";

  const mockResponseText =
    "This is a synthesized artist biography from Gemini API.";
  const mockResponse = {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: mockResponseText }],
          },
        },
      ],
    }),
  };
  global.fetch = fn().mockResolvedValue(mockResponse) as any;

  const service = new LlmService();
  const bio = await service.synthesizeBio("Some artist info");

  assert.equal(bio, mockResponseText);
  const fetchCalls = (global.fetch as any).mock.calls;
  assert.equal(fetchCalls.length, 1);
  const [url, init] = fetchCalls[0];
  assert.ok(url.includes("test-gemini-key"));
  assert.equal(init.method, "POST");
});

test("LlmService reports a configuration error when GEMINI_API_KEY is missing", async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.LLM_MOCK_ENABLED;

  const service = new LlmService();
  await assert.rejects(
    () => service.synthesizeBio("Some artist info"),
    /GEMINI_API_KEY is not configured/,
  );
});

test("LlmService retries transient failures and exposes the final provider error", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GEMINI_RETRY_DELAY_MS = "0";

  // Mock fetch to reject with error (simulating network failure)
  global.fetch = fn().mockRejectedValue(
    new Error("Connection timed out"),
  ) as any;

  const service = new LlmService();
  await assert.rejects(
    () => service.synthesizeBio("Some artist info"),
    /Gemini biography generation failed: Connection timed out/,
  );
  // Assert it retried 3 times
  assert.equal((global.fetch as any).mock.calls.length, 3);
});

test("LlmService only returns fallback content when mock mode is explicitly enabled", async () => {
  delete process.env.GEMINI_API_KEY;
  process.env.LLM_MOCK_ENABLED = "true";
  const bio = await new LlmService().synthesizeBio("Some artist info");
  assert.ok(bio.includes("generated via the system fallback engine"));
});

// ==========================================
// WORKER SERVICE TESTS
// ==========================================

test("WorkerService generateBioJob success creates background job and publishes to RabbitMQ", async () => {
  const mockConcert = { id: "concert-123", name: "Cool Concert" };
  const mockJob = {
    id: "job-555",
    trigger_by_user_id: "user-777",
    job_type: "GENERATE_BIO",
    target_id: "concert-123",
    status: "PENDING",
    progress_percentage: 0,
    payload: { filename: "kit.pdf" },
  };

  const mockPrisma = {
    concert: {
      findUnique: fn().mockResolvedValue(mockConcert),
    },
    backgroundJob: {
      create: fn().mockResolvedValue(mockJob),
    },
  } as any;

  const mockRabbitMq = {
    publish: fn().mockResolvedValue(undefined),
  } as any;

  const service = new WorkerService(mockPrisma, mockRabbitMq);
  const file = {
    originalname: "kit.pdf",
    buffer: Buffer.from("PDF_CONTENT"),
  };

  const result = await service.generateBioJob("user-777", "concert-123", file);

  assert.deepEqual(result, mockJob);

  // Verify DB calls
  assert.equal(mockPrisma.concert.findUnique.mock.calls.length, 1);
  const findUniqueCall = mockPrisma.concert.findUnique.mock.calls[0][0];
  assert.equal(findUniqueCall.where.id, "concert-123");

  assert.equal(mockPrisma.backgroundJob.create.mock.calls.length, 1);
  const createCall = mockPrisma.backgroundJob.create.mock.calls[0][0];
  assert.equal(createCall.data.target_id, "concert-123");

  // Verify RabbitMQ call
  assert.equal(mockRabbitMq.publish.mock.calls.length, 1);
  const [exchange, routingKey, payload] = mockRabbitMq.publish.mock.calls[0];
  assert.equal(exchange, "ai.bio.exchange");
  assert.equal(routingKey, "ai.bio");
  assert.equal(payload.jobId, "job-555");
  assert.equal(payload.concertId, "concert-123");
  assert.equal(
    payload.pdfBase64,
    Buffer.from("PDF_CONTENT").toString("base64"),
  );
});

test("WorkerService generateBioJob throws NotFoundException when concert does not exist", async () => {
  const mockPrisma = {
    concert: {
      findUnique: fn().mockResolvedValue(null),
    },
  } as any;
  const mockRabbitMq = {} as any;

  const service = new WorkerService(mockPrisma, mockRabbitMq);
  const file = { originalname: "kit.pdf", buffer: Buffer.alloc(0) };

  await assert.rejects(
    async () => {
      await service.generateBioJob("user-777", "concert-not-found", file);
    },
    (err: any) => {
      assert.ok(err instanceof NotFoundException);
      assert.ok(err.message.includes("Concert not found"));
      return true;
    },
  );
});

// ==========================================
// BIO CONSUMER TESTS
// ==========================================

test("BioConsumer processes message successfully, extracts text, calls LLM, updates DB and evicts cache", async () => {
  const mockPayload = {
    jobId: "job-555",
    concertId: "concert-123",
    userId: "user-777",
    pdfBase64: Buffer.from("PDF_CONTENT").toString("base64"),
    filename: "kit.pdf",
  };

  const mockPrisma = {
    backgroundJob: {
      update: fn().mockResolvedValue({}),
    },
    concert: {
      update: fn().mockResolvedValue({}),
    },
    $transaction: async (cb: any) => cb(mockPrisma),
  } as any;

  const mockRabbitMq = {
    consume: fn(),
  } as any;

  const mockRedis = {
    delete: fn().mockResolvedValue(1),
    deleteByPattern: fn().mockResolvedValue(1),
  } as any;

  const mockLlm = {
    synthesizeBio: fn().mockResolvedValue("Synthesized bio text content"),
  } as any;

  const consumer = new BioConsumer(
    mockPrisma,
    mockRabbitMq,
    mockRedis,
    mockLlm,
  );

  // Directly call the private handler for testing
  await (consumer as any).handleBioGeneration(mockPayload);

  // 1. Verify pdf-parse was called with correct buffer
  assert.equal(mockPdfParseClass.mock.calls.length, 1);
  const parsedArgs = mockPdfParseClass.mock.calls[0][0];
  assert.equal(Buffer.from(parsedArgs.data).toString(), "PDF_CONTENT");
  assert.equal(mockGetText.mock.calls.length, 1);

  // 2. Verify LlmService was called with extracted text
  assert.equal(mockLlm.synthesizeBio.mock.calls.length, 1);
  const extractText = mockLlm.synthesizeBio.mock.calls[0][0];
  assert.equal(extractText, "Mocked PDF press kit text contents");

  // 3. Verify Concert update DB call
  assert.equal(mockPrisma.concert.update.mock.calls.length, 1);
  const concertUpdateCall = mockPrisma.concert.update.mock.calls[0][0];
  assert.equal(concertUpdateCall.where.id, "concert-123");
  assert.equal(concertUpdateCall.data.ai_bio, "Synthesized bio text content");

  // 4. Verify Redis cache eviction
  assert.equal(mockRedis.delete.mock.calls.length, 1);
  assert.equal(
    mockRedis.delete.mock.calls[0][0],
    "concerts:detail:concert-123",
  );
  assert.equal(mockRedis.deleteByPattern.mock.calls.length, 1);
  assert.equal(mockRedis.deleteByPattern.mock.calls[0][0], "concerts:list:*");

  // 5. Verify BackgroundJob status updates
  const jobUpdateCalls = mockPrisma.backgroundJob.update.mock.calls;
  // Should have updated status at 20%, 50%, 80%, and COMPLETED (100%)
  assert.equal(jobUpdateCalls.length, 4);

  // Check initial update
  assert.deepEqual(jobUpdateCalls[0][0].data, {
    status: "PROCESSING",
    progress_percentage: 20,
  });
  // Check completion update
  const finalCallData = jobUpdateCalls[3][0].data;
  assert.equal(finalCallData.status, "COMPLETED");
  assert.equal(finalCallData.progress_percentage, 100);
  assert.deepEqual(finalCallData.result_data, {
    bio: "Synthesized bio text content",
  });
  assert.ok(finalCallData.completed_at instanceof Date);
});

test("BioConsumer updates BackgroundJob to FAILED when processing fails and catches error", async () => {
  const mockPayload = {
    jobId: "job-555",
    concertId: "concert-123",
    userId: "user-777",
    pdfBase64: Buffer.from("PDF_CONTENT").toString("base64"),
    filename: "kit.pdf",
  };

  const mockPrisma = {
    backgroundJob: {
      update: fn().mockResolvedValue({}),
    },
    concert: {
      update: fn().mockRejectedValue(
        new Error("Database transaction lock error"),
      ),
    },
    $transaction: async (cb: any) => cb(mockPrisma),
  } as any;

  const mockRabbitMq = {} as any;
  const mockRedis = {} as any;
  const mockLlm = {
    synthesizeBio: fn().mockResolvedValue("Synthesized bio"),
  } as any;

  const consumer = new BioConsumer(
    mockPrisma,
    mockRabbitMq,
    mockRedis,
    mockLlm,
  );

  // Execute and assert it doesn't throw because it catches internal errors to ack the message
  await assert.doesNotReject(async () => {
    await (consumer as any).handleBioGeneration(mockPayload);
  });

  // Verify BackgroundJob was updated to FAILED
  const jobUpdateCalls = mockPrisma.backgroundJob.update.mock.calls;
  const lastCallData = jobUpdateCalls[jobUpdateCalls.length - 1][0].data;
  assert.equal(lastCallData.status, "FAILED");
  assert.equal(lastCallData.progress_percentage, 100);
  assert.ok(
    lastCallData.error_message.includes("Database transaction lock error"),
  );
  assert.ok(lastCallData.completed_at instanceof Date);
});
