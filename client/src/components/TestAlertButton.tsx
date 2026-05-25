import { useTestAlert } from "../hooks/useTestAlert";

export function TestAlertButton() {
  const { trigger, loading, result, error, clear } = useTestAlert();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <button
        onClick={trigger}
        disabled={loading}
        style={{
          background: loading ? "var(--bg-3)" : "var(--halt-dim)",
          border: `1px solid ${loading ? "var(--border)" : "var(--halt)50"}`,
          color: loading ? "var(--text-3)" : "var(--halt)",
          padding: "8px 18px",
          borderRadius: "var(--radius)",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "var(--sans)",
          fontWeight: 600,
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: "16px" }}>📞</span>
        {loading ? "Placing call..." : "Test Alert Call"}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          background:   result.success ? "var(--clear-dim)" : "var(--halt-dim)",
          border:       `1px solid ${result.success ? "var(--clear)30" : "var(--halt)30"}`,
          borderRadius: "var(--radius)",
          padding:      "12px",
          fontFamily:   "var(--mono)",
          fontSize:     "11px",
        }}>
          <div style={{
            color:        result.success ? "var(--clear)" : "var(--halt)",
            fontWeight:   700,
            marginBottom: "6px",
          }}>
            {result.success ? "✓ Call placed successfully" : "✕ Call failed"}
          </div>
          {result.calls.map((c, i) => (
            <div key={i} style={{ color: "var(--text-2)", marginBottom: "3px" }}>
              {c.ok ? "✓" : "✕"} {c.to}
              {c.callSid && (
                <span style={{ color: "var(--text-3)", marginLeft: "8px" }}>
                  SID: {c.callSid.slice(0, 16)}...
                </span>
              )}
              {c.error && (
                <span style={{ color: "var(--halt)", marginLeft: "8px" }}>{c.error.slice(0, 60)}</span>
              )}
            </div>
          ))}
          <button onClick={clear} style={{
            marginTop:    "8px",
            background:   "none",
            border:       "none",
            color:        "var(--text-3)",
            cursor:       "pointer",
            fontFamily:   "var(--mono)",
            fontSize:     "10px",
          }}>
            dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background:   "var(--halt-dim)",
          border:       "1px solid var(--halt)30",
          borderRadius: "var(--radius)",
          padding:      "10px 12px",
          fontFamily:   "var(--mono)",
          fontSize:     "11px",
          color:        "var(--halt)",
          display:      "flex",
          justifyContent: "space-between",
          alignItems:   "center",
        }}>
          <span>✕ {error}</span>
          <button onClick={clear} style={{
            background: "none", border: "none",
            color: "var(--text-3)", cursor: "pointer", fontSize: "14px",
          }}>×</button>
        </div>
      )}
    </div>
  );
}