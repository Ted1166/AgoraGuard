import { useState } from "react";
import { useArc, type AssetData, type Verdict } from "./hooks/useArc";
import { useWallet } from "./hooks/useWallet";
import { ARC, CONTRACTS } from "./config/contracts";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Landing } from "./components/Landing";
import { AlertSettings } from "./components/AlertSettings";

const VERDICT_COLOR: Record<Verdict, string> = {
  CLEAR: "var(--clear)",
  CAUTION: "var(--caution)",
  HALT: "var(--halt)",
};
const VERDICT_BG: Record<Verdict, string> = {
  CLEAR: "var(--clear-dim)",
  CAUTION: "var(--caution-dim)",
  HALT: "var(--halt-dim)",
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const pulse = verdict === "CLEAR" ? "pulse-clear" : verdict === "CAUTION" ? "pulse-caution" : "pulse-halt";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 10px", borderRadius: "4px",
      background: VERDICT_BG[verdict],
      border: `1px solid ${VERDICT_COLOR[verdict]}30`,
      color: VERDICT_COLOR[verdict],
      fontFamily: "var(--mono)", fontSize: "11px",
      fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const,
    }}>
      <span style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: VERDICT_COLOR[verdict],
        animation: `${pulse} 2s infinite`, flexShrink: 0,
      }} />
      {verdict}
    </span>
  );
}

function Btn({
  onClick, disabled, children, variant = "default", small = false,
}: {
  onClick: () => void; disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "ghost";
  small?: boolean;
}) {
  const colors = {
    default: { bg: "var(--accent-dim)", border: "var(--accent)50", color: "var(--accent)"   },
    success: { bg: "var(--clear-dim)", border: "var(--clear)50", color: "var(--clear)"    },
    danger:  { bg: "var(--halt-dim)", border: "var(--halt)50", color: "var(--halt)"     },
    ghost:   { bg: "transparent", border: "var(--border)", color: "var(--text-2)"   },
  };
  const c = colors[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "var(--bg-3)" : c.bg,
      border: `1px solid ${disabled ? "var(--border)" : c.border}`,
      color: disabled ? "var(--text-3)" : c.color,
      padding: small ? "5px 12px" : "8px 18px",
      borderRadius: "var(--radius)",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "var(--sans)", fontWeight: 600,
      fontSize: small ? "12px" : "13px",
      transition: "all 0.15s",
      whiteSpace: "nowrap" as const,
    }}>
      {children}
    </button>
  );
}

function TxNotice({ hash, onClose }: { hash: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      background: "var(--bg-2)", border: "1px solid var(--clear)40",
      borderRadius: "var(--radius-lg)", padding: "14px 18px",
      display: "flex", alignItems: "center", gap: "12px",
      zIndex: 999, maxWidth: "420px",
      boxShadow: "0 8px 32px #00000060",
    }}>
      <span style={{ color: "var(--clear)", fontSize: "16px" }}>✓</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
          Transaction confirmed
        </div>
        <a
          href={`${ARC.explorer}/tx/${hash}`}
          target="_blank" rel="noreferrer"
          style={{
            fontFamily: "var(--mono)", fontSize: "11px",
            color: "var(--accent)", textDecoration: "none",
          }}
        >
          {hash.slice(0, 20)}... ↗
        </a>
      </div>
      <button onClick={onClose} style={{
        background: "none", border: "none",
        color: "var(--text-3)", cursor: "pointer", fontSize: "16px",
      }}>×</button>
    </div>
  );
}

function ErrorNotice({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      background: "var(--bg-2)", border: "1px solid var(--halt)40",
      borderRadius: "var(--radius-lg)", padding: "14px 18px",
      display: "flex", alignItems: "center", gap: "12px",
      zIndex: 999, maxWidth: "420px",
      boxShadow: "0 8px 32px #00000060",
    }}>
      <span style={{ color: "var(--halt)", fontSize: "16px" }}>✕</span>
      <div style={{ flex: 1, fontFamily: "var(--mono)", fontSize: "12px", color: "var(--halt)" }}>
        {msg}
      </div>
      <button onClick={onClose} style={{
        background: "none", border: "none",
        color: "var(--text-3)", cursor: "pointer", fontSize: "16px",
      }}>×</button>
    </div>
  );
}

type Page = "dashboard" | "positions" | "threats" | "log" | "alerts";

function Nav({ page, setPage, blockNumber, wallet }: {
  page: Page; setPage: (p: Page) => void;
  blockNumber: bigint;
  wallet: ReturnType<typeof useWallet>;
}) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: "56px",
      background: "var(--bg-2)", borderBottom: "1px solid var(--border)",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img src="/favicon.svg" alt="AgoraGuard" style={{ width: 28, height: 28 }} />
        <span style={{
          fontFamily: "var(--sans)", fontWeight: 800, fontSize: "16px",
          letterSpacing: "-0.02em",
          background: "linear-gradient(90deg, #e8edf5, #3d8ef8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>AgoraGuard</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: "9px",
          color: "var(--clear)", border: "1px solid var(--clear)40",
          padding: "1px 5px", borderRadius: "3px", letterSpacing: "0.1em",
        }}>ARC TESTNET</span>
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: "2px" }}>
        {(["dashboard","positions","threats","log", "alerts"] as Page[]).map(id => (
          <button key={id} onClick={() => setPage(id)} style={{
            background: page === id ? "var(--accent-dim)" : "transparent",
            border: page === id ? "1px solid var(--accent)40" : "1px solid transparent",
            color: page === id ? "var(--accent)" : "var(--text-2)",
            padding: "5px 14px", borderRadius: "var(--radius)",
            cursor: "pointer", fontFamily: "var(--sans)",
            fontWeight: 600, fontSize: "13px",
          }}>
            {id === "log" ? "Guard Log" : id === "alerts" ? "🔔 Alerts" : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {/* Right: block + wallet */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "var(--clear)", animation: "pulse-clear 2s infinite",
          }} />
          {blockNumber > 0n ? blockNumber.toLocaleString() : "—"}
        </span>

        {wallet.isConnected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {wallet.isWrongNetwork && (
              <Btn onClick={wallet.switchNetwork} variant="danger" small>
                Switch to Arc
              </Btn>
            )}
            {wallet.isProtected && (
              <span style={{
                fontFamily: "var(--mono)", fontSize: "10px",
                color: "var(--clear)", border: "1px solid var(--clear)40",
                padding: "2px 8px", borderRadius: "4px",
              }}>🛡 Protected</span>
            )}
            <span style={{
              fontFamily: "var(--mono)", fontSize: "12px",
              background: "var(--bg-3)", border: "1px solid var(--border)",
              padding: "5px 10px", borderRadius: "var(--radius)",
              color: "var(--text-2)",
            }}>
              {wallet.address!.slice(0, 6)}...{wallet.address!.slice(-4)}
            </span>
          </div>
        ) : (
          <Btn onClick={wallet.connect} variant="success" small>
            Connect Wallet
          </Btn>
        )}
      </div>
    </nav>
  );
}

function WalletPanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const hasUSDC = parseFloat(wallet.usdcVault) > 0;
  const hasEURC = parseFloat(wallet.eurcVault) > 0;

  return (
    <div style={{
      background: "var(--bg-2)",
      border: `1px solid ${wallet.isProtected ? "var(--clear)30" : "var(--border)"}`,
      borderRadius: "var(--radius-lg)", padding: "20px",
      display: "flex", flexDirection: "column", gap: "16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>
            Your Protection Status
          </div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: "11px",
            color: "var(--text-3)", marginTop: "2px",
          }}>
            {wallet.address!.slice(0, 10)}...{wallet.address!.slice(-6)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {wallet.isProtected ? (
            <Btn
              onClick={wallet.disableProtection}
              disabled={wallet.txPending}
              variant="danger" small
            >
              {wallet.txPending ? "Pending..." : "Disable Protection"}
            </Btn>
          ) : (
            <Btn
              onClick={wallet.enableProtection}
              disabled={wallet.txPending}
              variant="success" small
            >
              {wallet.txPending ? "Pending..." : "🛡 Enable Protection"}
            </Btn>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: "10px",
      }}>
        <div style={{
          background: "var(--bg-3)", borderRadius: "var(--radius)", padding: "12px",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: "10px",
            color: "var(--text-3)", marginBottom: "6px",
          }}>STATUS</div>
          <div style={{
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: "14px",
            color: wallet.isProtected ? "var(--clear)" : "var(--text-3)",
          }}>
            {wallet.isProtected ? "🛡 ACTIVE" : "INACTIVE"}
          </div>
        </div>
        <div style={{ background: "var(--bg-3)", borderRadius: "var(--radius)", padding: "12px" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: "10px",
            color: "var(--text-3)", marginBottom: "6px",
          }}>USDC IN VAULT</div>
          <div style={{
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: "14px",
            color: hasUSDC ? "var(--caution)" : "var(--text-2)",
          }}>
            {parseFloat(wallet.usdcVault).toFixed(2)} USDC
          </div>
          {hasUSDC && (
            <button onClick={() => wallet.withdraw(ARC.tokens.USDC)}
              disabled={wallet.txPending}
              style={{
                marginTop: "6px", background: "var(--caution-dim)",
                border: "1px solid var(--caution)40", color: "var(--caution)",
                padding: "3px 8px", borderRadius: "4px",
                fontFamily: "var(--mono)", fontSize: "10px",
                cursor: "pointer",
              }}>
              Withdraw ↗
            </button>
          )}
        </div>
        <div style={{ background: "var(--bg-3)", borderRadius: "var(--radius)", padding: "12px" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: "10px",
            color: "var(--text-3)", marginBottom: "6px",
          }}>EURC IN VAULT</div>
          <div style={{
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: "14px",
            color: hasEURC ? "var(--caution)" : "var(--text-2)",
          }}>
            {parseFloat(wallet.eurcVault).toFixed(2)} EURC
          </div>
          {hasEURC && (
            <button onClick={() => wallet.withdraw(ARC.tokens.EURC)}
              disabled={wallet.txPending}
              style={{
                marginTop: "6px", background: "var(--caution-dim)",
                border: "1px solid var(--caution)40", color: "var(--caution)",
                padding: "3px 8px", borderRadius: "4px",
                fontFamily: "var(--mono)", fontSize: "10px",
                cursor: "pointer",
              }}>
              Withdraw ↗
            </button>
          )}
        </div>
      </div>

      <div style={{
        fontFamily: "var(--mono)", fontSize: "11px",
        color: "var(--text-3)", lineHeight: 1.6,
        borderTop: "1px solid var(--border)", paddingTop: "12px",
      }}>
        {wallet.isProtected
          ? "✓ Your wallet is registered. When the agent detects a HALT verdict, your tokens are automatically moved to the GuardianVault. You can withdraw at any time."
          : "Enable protection to have the agent automatically protect your tokens when a HALT verdict is triggered. No manual action needed."}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: AssetData }) {
  const { state, stats, history, symbol } = asset;
  if (!state) return null;

  const chartData = history.slice(-20).map((h, i) => ({ i, rsi: h.rsi }));
  const flagNames = ["Drawdown","Volatility","RSI","Spread","Cooldown","Threat"];
  const activeFlags = flagNames.filter((_, i) => (state.cautionFlags >> i) & 1);

  return (
    <div className="fade-in" style={{
      background: "var(--bg-2)",
      border: `1px solid ${VERDICT_COLOR[state.verdict]}30`,
      borderRadius: "var(--radius-lg)", padding: "20px",
      display: "flex", flexDirection: "column", gap: "16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: "20px" }}>{symbol}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-3)", marginTop: "2px" }}>
            {asset.address.slice(0,6)}...{asset.address.slice(-4)}
          </div>
        </div>
        <VerdictBadge verdict={state.verdict} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {[
          { label: "RSI", value: state.rsi, unit: "" },
          { label: "ATR", value: state.atrMultiple.toFixed(2), unit: "×" },
          { label: "Drawdown", value: state.drawdownPct.toFixed(2), unit: "%"   },
          { label: "Spread", value: state.spreadBps, unit: "bps" },
        ].map(m => (
          <div key={m.label} style={{
            background: "var(--bg-3)", borderRadius: "var(--radius)", padding: "10px 12px",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-3)", marginBottom: "4px" }}>
              {m.label}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700 }}>
              {m.value}<span style={{ fontSize: "11px", color: "var(--text-3)" }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {chartData.length > 2 && (
        <div style={{ height: 56 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`g-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VERDICT_COLOR[state.verdict]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={VERDICT_COLOR[state.verdict]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="rsi"
                stroke={VERDICT_COLOR[state.verdict]} strokeWidth={1.5}
                fill={`url(#g-${symbol})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeFlags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {activeFlags.map(f => (
            <span key={f} style={{
              background: "var(--caution-dim)", border: "1px solid var(--caution)30",
              color: "var(--caution)", fontFamily: "var(--mono)",
              fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
            }}>{f}</span>
          ))}
        </div>
      )}

      <div style={{
        fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-2)",
        lineHeight: 1.5, borderTop: "1px solid var(--border)", paddingTop: "12px",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const, overflow: "hidden",
      }}>
        {state.reason || "Awaiting agent cycle..."}
      </div>

      {stats && (
        <div style={{ display: "flex", gap: "12px", fontFamily: "var(--mono)", fontSize: "11px" }}>
          {[
            { l: "CLEAR", v: stats.clearCount, c: "var(--clear)" },
            { l: "CAUTION", v: stats.cautionCount, c: "var(--caution)" },
            { l: "HALT", v: stats.haltCount, c: "var(--halt)" },
          ].map(s => (
            <span key={s.l} style={{ color: "var(--text-3)" }}>
              <span style={{ color: s.c, fontWeight: 700 }}>{s.v}</span> {s.l}
            </span>
          ))}
          <span style={{ color: "var(--text-3)", marginLeft: "auto" }}>{stats.totalRecords} cycles</span>
        </div>
      )}
    </div>
  );
}

function Dashboard({ assets, loading, wallet }: {
  assets: AssetData[]; loading: boolean;
  wallet: ReturnType<typeof useWallet>;
}) {
  const counts = {
    clear: assets.filter(a => a.state?.verdict === "CLEAR").length,
    caution: assets.filter(a => a.state?.verdict === "CAUTION").length,
    halt: assets.filter(a => a.state?.verdict === "HALT").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Wallet panel */}
      {wallet.isConnected && !wallet.isWrongNetwork && (
        <WalletPanel wallet={wallet} />
      )}

      {/* Connect CTA */}
      {!wallet.isConnected && (
        <div style={{
          background: "var(--bg-2)", border: "1px solid var(--accent)30",
          borderRadius: "var(--radius-lg)", padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
              Connect your wallet to enable protection
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-3)" }}>
              The agent will automatically protect your tokens when a HALT verdict is triggered
            </div>
          </div>
          <Btn onClick={wallet.connect} variant="success">
            Connect MetaMask
          </Btn>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Monitored", value: assets.length, color: "var(--accent)" },
          { label: "CLEAR", value: counts.clear,  color: "var(--clear)" },
          { label: "CAUTION", value: counts.caution,color: "var(--caution)" },
          { label: "HALT", value: counts.halt,   color: "var(--halt)" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--bg-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "16px 20px",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-3)",
              marginBottom: "8px", letterSpacing: "0.08em", textTransform: "uppercase" as const,
            }}>{s.label}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "32px", fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Asset grid */}
      {loading ? (
        <div style={{
          textAlign: "center", padding: "60px",
          fontFamily: "var(--mono)", color: "var(--text-3)",
        }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⬡</div>
          Connecting to Arc Testnet...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {assets.map(a => <AssetCard key={a.address} asset={a} />)}
        </div>
      )}
    </div>
  );
}

function Positions({ assets }: { assets: AssetData[] }) {
  function bin(n: number) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }

  return (
    <div style={{
      background: "var(--bg-2)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "24px",
      display: "flex", flexDirection: "column", gap: "16px",
    }}>
      <div style={{ fontWeight: 700, fontSize: "15px" }}>Live Guard Positions</div>

      {assets.map(asset => {
        if (!asset.state) return null;
        const { verdict, drawdownPct, rsi, atrMultiple, cautionFlags } = asset.state;
        const maxPct     = 20;
        const allowed    = verdict === "HALT" ? 0 :
                           verdict === "CAUTION" ? maxPct * Math.pow(0.67, bin(cautionFlags)) :
                           maxPct;

        return (
          <div key={asset.address} style={{
            background: "var(--bg-3)", borderRadius: "var(--radius)", padding: "16px",
            border: `1px solid ${VERDICT_COLOR[verdict]}20`,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: 700, fontSize: "15px" }}>{asset.symbol}</span>
                <VerdictBadge verdict={verdict} />
              </div>
              <span style={{
                fontFamily: "var(--mono)", fontSize: "20px",
                fontWeight: 700, color: VERDICT_COLOR[verdict],
              }}>
                {allowed.toFixed(1)}%
                <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 400 }}> allowed</span>
              </span>
            </div>
            <div style={{
              height: "6px", background: "var(--bg-2)",
              borderRadius: "3px", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${(allowed / maxPct) * 100}%`,
                background: VERDICT_COLOR[verdict], borderRadius: "3px",
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{
              display: "flex", gap: "20px", marginTop: "10px",
              fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)",
            }}>
              <span>RSI <span style={{ color: "var(--text-2)" }}>{rsi}</span></span>
              <span>ATR <span style={{ color: "var(--text-2)" }}>{atrMultiple.toFixed(2)}×</span></span>
              <span>Drawdown <span style={{ color: "var(--text-2)" }}>{drawdownPct.toFixed(2)}%</span></span>
              <span style={{ marginLeft: "auto" }}>Max <span style={{ color: "var(--text-2)" }}>{maxPct}%</span></span>
            </div>
          </div>
        );
      })}

      <div style={{
        background: "var(--bg-3)", borderRadius: "var(--radius)", padding: "16px",
        fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)", lineHeight: 1.8,
      }}>
        <div style={{ color: "var(--text-2)", marginBottom: "8px", fontWeight: 700 }}>Position sizing rules</div>
        <div><span style={{ color: "var(--clear)" }}>CLEAR</span>→ up to 20% of portfolio</div>
        <div><span style={{ color: "var(--caution)" }}>CAUTION</span>→ 20% × 0.67^(caution flags raised)</div>
        <div><span style={{ color: "var(--halt)" }}>HALT</span>→ 0% — GuardianVault protection triggered</div>
      </div>
    </div>
  );
}

const THREAT_TYPES = [
  "Unknown","Malicious Contract","Honeypot","Rug Pull",
  "Excessive Approval","Market Manipulation","Flash Loan","Other",
];

function ReportModal({ symbol, onClose, onSubmit, pending }: {
  symbol: string;
  onClose: () => void;
  onSubmit: (score: number, type: number, reason: string) => void;
  pending: boolean;
}) {
  const [score, setScore] = useState(50);
  const [type, setType] = useState(0);
  const [reason, setReason] = useState("");

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000080",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200,
    }}>
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "24px",
        width: "480px", display: "flex", flexDirection: "column", gap: "16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>Report Threat — {symbol}</div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-3)",
            cursor: "pointer", fontSize: "18px",
          }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "6px" }}>
              THREAT SCORE: {score}/100
            </label>
            <input type="range" min={0} max={100} value={score}
              onChange={e => setScore(Number(e.target.value))}
              style={{ width: "100%", accentColor: score >= 75 ? "var(--halt)" : score >= 50 ? "var(--caution)" : "var(--clear)" }}
            />
          </div>

          <div>
            <label style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "6px" }}>
              THREAT TYPE
            </label>
            <select value={type} onChange={e => setType(Number(e.target.value))} style={{
              width: "100%", background: "var(--bg-3)",
              border: "1px solid var(--border)", color: "var(--text)",
              padding: "8px", borderRadius: "var(--radius)",
              fontFamily: "var(--mono)", fontSize: "12px",
            }}>
              {THREAT_TYPES.map((t, i) => <option key={i} value={i}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)", display: "block", marginBottom: "6px" }}>
              REASON
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Describe the threat..."
              style={{
                width: "100%", background: "var(--bg-3)",
                border: "1px solid var(--border)", color: "var(--text)",
                padding: "10px", borderRadius: "var(--radius)",
                fontFamily: "var(--mono)", fontSize: "12px",
                resize: "vertical", minHeight: "80px",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn
            onClick={() => onSubmit(score, type, reason)}
            disabled={pending || !reason.trim()}
            variant="danger"
          >
            {pending ? "Submitting..." : "Submit Report"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Threats({ assets, threats, wallet }: {
  assets: AssetData[];
  threats: Record<string, any[]>;
  wallet: ReturnType<typeof useWallet>;
}) {
  const [reporting, setReporting] = useState<string | null>(null);

  const handleReport = async (score: number, type: number, reason: string) => {
    if (!reporting) return;
    await wallet.reportThreat(reporting as `0x${string}`, score, type, reason);
    setReporting(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {reporting && (
        <ReportModal
          symbol={assets.find(a => a.address === reporting)?.symbol ?? ""}
          onClose={() => setReporting(null)}
          onSubmit={handleReport}
          pending={wallet.txPending}
        />
      )}

      {assets.map(asset => {
        const reports = threats[asset.address] ?? [];
        const score   = reports.length > 0
          ? Math.round(reports.reduce((a, r) => a + r.score, 0) / reports.length) : 0;

        return (
          <div key={asset.address} style={{
            background: "var(--bg-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: reports.length > 0 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>{asset.symbol}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)" }}>
                {asset.address.slice(0, 10)}...
              </span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: "20px", fontWeight: 700,
                  color: score >= 75 ? "var(--halt)" : score >= 50 ? "var(--caution)" : "var(--clear)",
                }}>
                  {score}/100
                </span>
                {wallet.isConnected && !wallet.isWrongNetwork && (
                  <Btn onClick={() => setReporting(asset.address)} variant="danger" small>
                    + Report Threat
                  </Btn>
                )}
                {!wallet.isConnected && (
                  <Btn onClick={wallet.connect} variant="ghost" small>
                    Connect to Report
                  </Btn>
                )}
              </div>
            </div>

            {reports.length > 0 ? reports.map((r, i) => (
              <div key={i} style={{
                padding: "14px 20px",
                borderBottom: i < reports.length - 1 ? "1px solid var(--border)" : "none",
                display: "grid", gridTemplateColumns: "70px 150px 1fr 80px",
                alignItems: "center", gap: "16px",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontWeight: 700, fontSize: "20px",
                  color: r.score >= 75 ? "var(--halt)" : r.score >= 50 ? "var(--caution)" : "var(--clear)",
                }}>{r.score}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: "11px",
                  background: "var(--bg-3)", padding: "3px 8px",
                  borderRadius: "4px", color: "var(--text-2)",
                }}>{THREAT_TYPES[r.threatType] ?? "Unknown"}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-2)" }}>
                  {r.reason}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => wallet.upvoteReport(asset.address as `0x${string}`, i)}
                    disabled={!wallet.isConnected || wallet.txPending}
                    style={{
                      background: "var(--accent-dim)", border: "1px solid var(--accent)30",
                      color: "var(--accent)", padding: "3px 8px",
                      borderRadius: "4px", fontFamily: "var(--mono)",
                      fontSize: "11px", cursor: wallet.isConnected ? "pointer" : "not-allowed",
                    }}
                  >
                    ↑ {r.upvotes}
                  </button>
                  {r.verified && <span style={{ color: "var(--clear)", fontSize: "12px" }}>✓</span>}
                </div>
              </div>
            )) : (
              <div style={{
                padding: "20px", fontFamily: "var(--mono)",
                fontSize: "12px", color: "var(--text-3)", textAlign: "center",
              }}>
                No reports yet. Be the first to report a threat.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GuardLog({ assets }: { assets: AssetData[] }) {
  const rows = assets
    .flatMap(a => a.history.map(h => ({ ...h, symbol: a.symbol })))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  return (
    <div style={{
      background: "var(--bg-2)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 700, fontSize: "15px" }}>Guard Decision Log</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)" }}>
          {rows.length} entries
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "var(--bg-3)", borderBottom: "1px solid var(--border)" }}>
              {["Time","Asset","Verdict","RSI","ATR","Drawdown%","Spread","Block","Reason"].map(h => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left",
                  color: "var(--text-3)", fontWeight: 400,
                  fontSize: "10px", letterSpacing: "0.08em",
                  textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>
                No history yet
              </td></tr>
            ) : rows.map((h, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-3)", whiteSpace: "nowrap" as const }}>
                  {h.timestamp > 0 ? new Date(h.timestamp * 1000).toLocaleTimeString() : "—"}
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{h.symbol}</td>
                <td style={{ padding: "10px 14px" }}><VerdictBadge verdict={h.verdict} /></td>
                <td style={{ padding: "10px 14px" }}>{h.rsi}</td>
                <td style={{ padding: "10px 14px" }}>{h.atrMultiple.toFixed(2)}×</td>
                <td style={{ padding: "10px 14px" }}>{h.drawdownPct.toFixed(2)}%</td>
                <td style={{ padding: "10px 14px" }}>{h.spreadBps}bps</td>
                <td style={{ padding: "10px 14px", color: "var(--text-3)" }}>{h.blockNumber.toLocaleString()}</td>
                <td style={{
                  padding: "10px 14px", color: "var(--text-2)",
                  maxWidth: "300px", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                }}>{h.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const { assets, threats, blockNumber, loading } = useArc(30_000);
  const wallet = useWallet();
  const [showLanding, setShowLanding] = useState(true);

  if (showLanding) return <Landing onEnter={() => setShowLanding(false)}/> 

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: "40px 40px", opacity: 0.3, pointerEvents: "none",
      }} />

      <Nav page={page} setPage={setPage}
        blockNumber={blockNumber}
        wallet={wallet} />

      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: "1280px", margin: "0 auto",
        padding: "80px 24px 40px",
      }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{
            fontFamily: "var(--sans)", fontWeight: 800,
            fontSize: "28px", letterSpacing: "-0.03em",
          }}>
            {page === "dashboard" && "Risk Dashboard"}
            {page === "positions" && "Position Sizing"}
            {page === "threats" && "Threat Registry"}
            {page === "log" && "Guard Decision Log"}
            {page === "alerts" && "Alert Settings"}
          </h1>
          <p style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
            {page === "dashboard" && "Live guard verdicts from Arc Testnet • Auto-refreshes every 30s"}
            {page === "positions" && "Allowed position sizes driven by 5-guard engine"}
            {page === "threats" && "Onchain ThreatRegistry • Report and upvote threats"}
            {page === "log" && "Full history of agent guard decisions from RiskGuardOracle"}
            {page === "alerts" && "Configure phone call and WhatsApp alerts for HALT events"}
          </p>
        </div>

        {page === "dashboard" && <Dashboard assets={assets} loading={loading} wallet={wallet} />}
        {page === "positions" && <Positions assets={assets} />}
        {page === "threats" && <Threats assets={assets} threats={threats} wallet={wallet} />}
        {page === "log" && <GuardLog assets={assets} />}
        {page === "alerts" && <AlertSettings walletAddress={wallet.address} />}
      </main>

      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid var(--border)",
        padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-3)",
        maxWidth: "1280px", margin: "0 auto",
      }}>
        <span>AgoraGuard · Arc Testnet · Chain ID 5042002</span>
        <a
          href={`${ARC.explorer}/address/${CONTRACTS.riskGuardOracle}`}
          target="_blank" rel="noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          Oracle {CONTRACTS.riskGuardOracle.slice(0, 10)}... ↗
        </a>
      </footer>

      {/* Notifications */}
      {wallet.txHash && <TxNotice hash={wallet.txHash} onClose={wallet.clearTx} />}
      {wallet.error  && <ErrorNotice msg={wallet.error}  onClose={wallet.clearError} />}
    </div>
  );
}