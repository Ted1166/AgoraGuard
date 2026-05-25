import { createServer, IncomingMessage, ServerResponse } from "http";
import { logger }      from "./utils/logger.js";
import { makeAlertCalls } from "./alerts/call.js";
import { ALERTS }      from "./alerts/config.js";

const PORT = Number(process.env.PORT ?? 3001);

const ALLOWED = [
  "https://agora-guard.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin ?? "";
  if (ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

export function startServer() {
  const server = createServer(async (req, res) => {
    cors(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204); res.end(); return;
    }

    const url = req.url?.split("?")[0];

    if (req.method === "GET" && url === "/health") {
      return json(res, 200, {
        status:   "ok",
        agent:    "AgoraGuard",
        twilio:   ALERTS.twilio.enabled,
        time:     new Date().toISOString(),
      });
    }

    if (req.method === "POST" && url === "/test-alert") {
      const secret = req.headers["x-api-key"];
      if (process.env.AGENT_API_KEY && secret !== process.env.AGENT_API_KEY) {
        return json(res, 401, { error: "Unauthorized" });
      }

      if (!ALERTS.twilio.enabled) {
        return json(res, 400, { error: "Twilio not configured on this agent instance" });
      }

      let body: any = {};
      try { body = await readBody(req); } catch { /* use defaults */ }

      const mockVerdict: any = {
        symbol:          body.symbol ?? "BTCUSDT",
        tokenAddress:    "0x3600000000000000000000000000000000000000",
        verdict:         "HALT",
        verdictCode:     2,
        cautionFlags:    7,
        cautionCount:    3,
        allowedPositionPct: 0,
        drawdownBps:     1300,
        atrMultipleBps:  260,
        rsi:             21,
        spreadBps:       0,
        threatScore:     0,
        reasons:         ["[HALT-DRAWDOWN] Drawdown 13% — hard halt"],
        summary:         "TEST ALERT — ignore",
      };

      const mockDecision: any = {
        action:        "HOLD",
        sizePct:       0,
        stopLossPct:   3,
        takeProfitPct: null,
        confidence:    100,
        reasoning:     "This is a test alert from AgoraGuard. Your protection system is working correctly.",
        source:        "rule-based",
      };

      try {
        const results = await makeAlertCalls(mockVerdict, mockDecision, mockDecision.reasoning);
        const ok      = results.filter(r => r.ok).length;
        const failed  = results.filter(r => !r.ok).length;

        logger.info(`Server › /test-alert → ${ok} calls placed, ${failed} failed`);

        return json(res, 200, {
          success: ok > 0,
          calls:   results.map(r => ({
            to:      r.to.replace(/\d(?=\d{4})/g, "*"),
            ok:      r.ok,
            callSid: r.callSid,
            error:   r.error,
          })),
        });
      } catch (err) {
        logger.error("Server › /test-alert error", { error: String(err) });
        return json(res, 500, { error: String(err).slice(0, 200) });
      }
    }

    if (req.method === "GET" && url === "/status") {
      return json(res, 200, {
        agent:           "AgoraGuard",
        version:         "1.0.0",
        twilio:          ALERTS.twilio.enabled,
        phonesConfigured: ALERTS.twilio.toPhones.length,
        webhooks:        ALERTS.webhookUrls.length,
        time:            new Date().toISOString(),
      });
    }

    json(res, 404, { error: "Not found" });
  });

  server.listen(PORT, () => {
    logger.info(`Server › HTTP server listening on port ${PORT}`);
    logger.info(`Server › Health: http://localhost:${PORT}/health`);
    logger.info(`Server › Test alert: POST http://localhost:${PORT}/test-alert`);
  });

  return server;
}