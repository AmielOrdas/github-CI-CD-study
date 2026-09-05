import cors from "cors";
import express from "express";

const app = express();

// The frontend (localhost:3000) is a DIFFERENT origin than this API (localhost:4000),
// so the browser blocks requests unless we explicitly allow them. cors() with no
// options allows all origins — fine for a demo; real apps list specific origins.
app.use(cors());
const port = Number(process.env.PORT) || 4000;

// Version is hardcoded in source — bumped by humans/CI, baked into the image at build time.
const version = "Version 1";

// Secret comes from the environment — injected at RUNTIME (docker-compose .env or -e flag).
const secret = process.env.SECRET || "(no SECRET env var set)";
const appEnv = process.env.APP_ENV || "(no APP_ENV env var set)";

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// The endpoint the frontend calls. Three things: version, secret, env variables.
// NOTE: exposing a secret to the client is fine for this demo but is a security
// bug in real life — secrets stay on the server.
app.get("/api/version", (_req, res) => {
  res.json({
    version,
    secret,
    environmentVariables: {
      APP_ENV: appEnv,
      SECRET: secret,
    },
  });
});

app.listen(port, () => {
  console.log(`Server ${version} listening on http://localhost:${port}`);
});