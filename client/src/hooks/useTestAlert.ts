import { useState, useCallback } from "react";

const AGENT_URL = import.meta.env.VITE_AGENT_URL  ?? "http://localhost:3001";
const AGENT_KEY = import.meta.env.VITE_AGENT_API_KEY ?? "";

export interface TestAlertResult {
  success: boolean;
  calls: { to: string; ok: boolean; callSid: string | null; error?: string }[];
  error?: string;
}

export function useTestAlert() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestAlertResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${AGENT_URL}/test-alert`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AGENT_KEY ? { "x-api-key": AGENT_KEY } : {}),
        },
        body: JSON.stringify({ symbol: "BTCUSDT" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { trigger, loading, result, error, clear: () => { setResult(null); setError(null); } };
}