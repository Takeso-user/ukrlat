import { join } from "node:path";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import { transliterateWithCase } from "./transliterate";

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  // REST API endpoint for transliteration
  app.post("/api/v1/transliterate", (req: Request, res: Response) => {
    const { inputText } = req.body || {};

    if (inputText === undefined || inputText === null) {
      return res
        .status(400)
        .json({ error: "Missing inputText in the request body" });
    }

    if (typeof inputText !== "string") {
      return res.status(400).json({ error: "inputText must be a string" });
    }

    const outputText = transliterateWithCase(inputText);
    return res.json({ outputText });
  });

  // Healthcheck endpoint for monitoring / Railway
  app.get("/health", (_req: Request, res: Response) => {
    return res.status(200).json({ status: "ok" });
  });

  // Serve static files from 'public' directory
  const publicDir = join(process.cwd(), "public");
  app.use(express.static(publicDir));

  // Serve index.html on root
  app.get("/", (_req: Request, res: Response) => {
    return res.sendFile(join(publicDir, "index.html"));
  });

  return app;
}

export const app = createApp();
export default app;
