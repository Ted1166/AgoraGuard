import { useState, useEffect } from "react";
import { useTestAlert } from "../hooks/useTestAlert";

interface AlertProfile {
  phone: string;
  whatsapp: string;
  callOnHalt: boolean;
  whatsappOnHalt: boolean;
  whatsappOnCaution: boolean;
  savedAt: number | null;
}

const DEFAULT: AlertProfile = {
  phone: "",
  whatsapp: "",
  callOnHalt: true,
  whatsappOnHalt: true,
  whatsappOnCaution: false,
  savedAt: null,
};

const STORAGE_KEY = "agoraguard:alert-profile";

function load(): AlertProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
}

function save(p: AlertProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...p, savedAt: Date.now() }));
}

function Toggle({ on, onToggle, label, sub }: {
  on: boolean; onToggle: () => void; label: string; sub?: string;
}) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderRadius: "var(--radius)",
      background: "var(--bg-3)", cursor: "pointer",
      border: `1px solid ${on ? "var(--clear)30" : "var(--border)"}`,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: "13px" }}>{label}</div>
        {sub && <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>{sub}</div>}
      </div>
      <div style={{
        width: "40px", height: "22px", borderRadius: "11px",
        background: on ? "var(--clear)" : "var(--bg-2)",
        border: `1px solid ${on ? "var(--clear)" : "var(--border)"}`,
        position: "relative", transition: "all 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: "3px",
          left: on ? "20px" : "3px",
          width: "14px", height: "14px", borderRadius: "50%",
          background: on ? "#fff" : "var(--text-3)",
          transition: "left 0.2s",
        }} />
      </div>
    </div>
  );
}

export function AlertSettings({ walletAddress }: { walletAddress: string | null }) {
  const [profile, setProfile] = useState<AlertProfile>(load);
  const [saved, setSaved] = useState(false);
  const { trigger, loading: callLoading, result: callResult, error: callError } = useTestAlert();
  const testSent = callLoading ? "Placing call..." :
                   callResult?.success ? "✓ Call placed! Check your phone." :
                   callError ?? null;

  useEffect(() => { setProfile(load()); }, [walletAddress]);

  const update = (patch: Partial<AlertProfile>) =>
    setProfile(p => ({ ...p, ...patch }));

  const handleSave = () => {
    save(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async (channel: "call" | "whatsapp") => {
    if (channel === "call") await trigger();
  };

  const phoneValid = profile.phone.match(/^\+\d{7,15}$/) !== null;
  const waValid    = profile.whatsapp.match(/^\+\d{7,15}$/) !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "640px" }}>

      {/* Header */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "22px", letterSpacing: "-0.02em", margin: 0 }}>
          Alert Settings
        </h2>
        <p style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
          Get a phone call or WhatsApp message the moment AgoraGuard detects a HALT
        </p>
      </div>

      {/* Phone call section */}
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "20px",
        display: "flex", flexDirection: "column", gap: "14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>📞</span>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>Voice Call Alerts</div>
          <span style={{
            fontFamily: "var(--mono)", fontSize: "9px",
            color: "var(--halt)", border: "1px solid var(--halt)40",
            padding: "1px 6px", borderRadius: "3px",
          }}>HALT ONLY</span>
        </div>

        <div>
          <label style={{
            fontFamily: "var(--mono)", fontSize: "11px",
            color: "var(--text-3)", display: "block", marginBottom: "6px",
          }}>
            PHONE NUMBER (E.164 FORMAT)
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="tel"
              value={profile.phone}
              onChange={e => update({ phone: e.target.value })}
              placeholder="+254712345678"
              style={{
                flex: 1,
                background: "var(--bg-3)",
                border: `1px solid ${profile.phone && !phoneValid ? "var(--halt)" : "var(--border)"}`,
                color: "var(--text)", padding: "9px 12px",
                borderRadius: "var(--radius)",
                fontFamily: "var(--mono)", fontSize: "13px",
              }}
            />
            {phoneValid && (
              <button
                onClick={() => handleTest("call")}
                style={{
                  background: "var(--accent-dim)", border: "1px solid var(--accent)40",
                  color: "var(--accent)", padding: "9px 14px",
                  borderRadius: "var(--radius)", cursor: "pointer",
                  fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap",
                }}
              >
                Test Call
              </button>
            )}
          </div>
          {profile.phone && !phoneValid && (
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--halt)", marginTop: "4px" }}>
              Use E.164 format: +254712345678
            </div>
          )}
        </div>

        <Toggle
          on={profile.callOnHalt}
          onToggle={() => update({ callOnHalt: !profile.callOnHalt })}
          label="Call me on HALT verdict"
          sub="Immediate voice call when all trading is paused"
        />
      </div>

      {/* WhatsApp section */}
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "20px",
        display: "flex", flexDirection: "column", gap: "14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>💬</span>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>WhatsApp Alerts</div>
        </div>

        <div>
          <label style={{
            fontFamily: "var(--mono)", fontSize: "11px",
            color: "var(--text-3)", display: "block", marginBottom: "6px",
          }}>
            WHATSAPP NUMBER (E.164 FORMAT)
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="tel"
              value={profile.whatsapp}
              onChange={e => update({ whatsapp: e.target.value })}
              placeholder="+254712345678"
              style={{
                flex: 1,
                background: "var(--bg-3)",
                border: `1px solid ${profile.whatsapp && !waValid ? "var(--halt)" : "var(--border)"}`,
                color: "var(--text)", padding: "9px 12px",
                borderRadius: "var(--radius)",
                fontFamily: "var(--mono)", fontSize: "13px",
              }}
            />
            {waValid && (
              <button
                onClick={() => handleTest("whatsapp")}
                style={{
                  background: "var(--accent-dim)", border: "1px solid var(--accent)40",
                  color: "var(--accent)", padding: "9px 14px",
                  borderRadius: "var(--radius)", cursor: "pointer",
                  fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap",
                }}
              >
                Test WA
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Toggle
            on={profile.whatsappOnHalt}
            onToggle={() => update({ whatsappOnHalt: !profile.whatsappOnHalt })}
            label="Message on HALT"
            sub="Full alert with metrics when trading is halted"
          />
          <Toggle
            on={profile.whatsappOnCaution}
            onToggle={() => update({ whatsappOnCaution: !profile.whatsappOnCaution })}
            label="Message on CAUTION"
            sub="Early warning when 3+ risk guards fire"
          />
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "20px",
      }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>How alerts work</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-2)" }}>
          {[
            ["🔴", "HALT detected", "Agent fires on all 5 guards — immediate voice call + WhatsApp"],
            ["🟡", "CAUTION detected", "3+ guards fire — WhatsApp message if enabled"],
            ["⏱️", "Cooldown", "5 minute cooldown per asset to prevent alert spam"],
            ["🔒", "Privacy", "Phone numbers stored locally in your browser only"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>
              <div>
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{title}</span>
                {" — "}
                <span>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test result */}
      {testSent && (
        <div style={{
          background: "var(--clear-dim)", border: "1px solid var(--clear)30",
          borderRadius: "var(--radius)", padding: "12px 16px",
          fontFamily: "var(--mono)", fontSize: "12px", color: "var(--clear)",
        }}>
          {testSent}
        </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={handleSave}
          style={{
            background: saved ? "var(--clear-dim)" : "var(--accent-dim)",
            border: `1px solid ${saved ? "var(--clear)50" : "var(--accent)50"}`,
            color: saved ? "var(--clear)" : "var(--accent)",
            padding: "10px 24px", borderRadius: "var(--radius)",
            cursor: "pointer", fontWeight: 700, fontSize: "14px",
            transition: "all 0.2s",
          }}
        >
          {saved ? "✓ Saved" : "Save Alert Settings"}
        </button>
        {profile.savedAt && (
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)" }}>
            Last saved {new Date(profile.savedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}