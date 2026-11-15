import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { app } from "../src/app";
import type { Server } from "http";

describe("API and Static HTTP Endpoints", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll((done) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("GET / serves the index.html page", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Транслітерація");
    expect(text).toContain("inputText");
  });

  test("GET /health returns status ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });

  test("GET /styles.css serves static CSS", async () => {
    const res = await fetch(`${baseUrl}/styles.css`);
    expect(res.status).toBe(200);
    const css = await res.text();
    expect(css.length).toBeGreaterThan(0);
  });

  test("GET /script.js serves static JS", async () => {
    const res = await fetch(`${baseUrl}/script.js`);
    expect(res.status).toBe(200);
    const js = await res.text();
    expect(js).toContain("transliterateText");
  });

  test("POST /api/v1/transliterate successfully transliterates text", async () => {
    const res = await fetch(`${baseUrl}/api/v1/transliterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText: "Привіт світ!" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { outputText: string };
    expect(data.outputText).toBe("Pryvit svit!");
  });

  test("POST /api/v1/transliterate preserves uppercase formatting", async () => {
    const res = await fetch(`${baseUrl}/api/v1/transliterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText: "СЬОГОДНІ В КИЄВІ" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { outputText: string };
    expect(data.outputText).toBe("ŚOGODNI V KYÊVI");
  });

  test("POST /api/v1/transliterate returns 400 when inputText is missing", async () => {
    const res = await fetch(`${baseUrl}/api/v1/transliterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Missing inputText in the request body");
  });

  test("POST /api/v1/transliterate returns 400 when inputText is not a string", async () => {
    const res = await fetch(`${baseUrl}/api/v1/transliterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText: 12345 }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("inputText must be a string");
  });
});
