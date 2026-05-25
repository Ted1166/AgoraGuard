export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* Grid bg */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: "40px 40px", opacity: 0.3, pointerEvents: "none",
      }} />

      {/* Nav */}
      <nav style={{
        position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "56px",
        background: "var(--bg-2)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🛡️</span>
          <span style={{
            fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em",
            background: "linear-gradient(90deg, #e8edf5, #3d8ef8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>AgoraGuard</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: "9px",
            color: "var(--clear)", border: "1px solid var(--clear)40",
            padding: "1px 5px", borderRadius: "3px", letterSpacing: "0.1em",
          }}>ARC TESTNET</span>
        </div>
        <button onClick={onEnter} style={{
          background: "var(--accent-dim)", border: "1px solid var(--accent)50",
          color: "var(--accent)", padding: "7px 18px",
          borderRadius: "var(--radius)", cursor: "pointer",
          fontWeight: 600, fontSize: "13px",
        }}>
          Open Dashboard →
        </button>
      </nav>

      {/* Hero */}
      <main style={{ position: "relative", zIndex: 1, flex: 1 }}>
        <div style={{
          maxWidth: "860px", margin: "0 auto",
          padding: "80px 32px 60px",
          display: "flex", flexDirection: "column", gap: "48px",
        }}>

          {/* Headline */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.15em",
              color: "var(--accent)", marginBottom: "16px", textTransform: "uppercase",
            }}>
              Built on Arc · Settled in USDC · Powered by Claude AI
            </div>
            <h1 style={{
              fontWeight: 900, fontSize: "clamp(36px, 6vw, 64px)",
              letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0,
            }}>
              AI that protects
              <br />
              <span style={{
                background: "linear-gradient(90deg, #3d8ef8, #00d4aa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                before it profits.
              </span>
            </h1>
            <p style={{
              fontFamily: "var(--mono)", fontSize: "15px", color: "var(--text-2)",
              marginTop: "20px", lineHeight: 1.7, maxWidth: "600px", margin: "20px auto 0",
            }}>
              AgoraGuard monitors your DeFi positions 24/7, scores risk across 5 independent guards,
              and calls your phone the moment it detects a threat. Most agents chase alpha.
              AgoraGuard's first job is <strong style={{ color: "var(--text)" }}>not losing money.</strong>
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "32px" }}>
              <button onClick={onEnter} style={{
                background: "var(--accent-dim)", border: "1px solid var(--accent)60",
                color: "var(--accent)", padding: "12px 28px",
                borderRadius: "var(--radius)", cursor: "pointer",
                fontWeight: 700, fontSize: "14px",
              }}>
                🛡 Open Dashboard
              </button>
              <a
                href="https://github.com/Ted1166/AgoraGuard"
                target="_blank" rel="noreferrer"
                style={{
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-2)", padding: "12px 28px",
                  borderRadius: "var(--radius)", cursor: "pointer",
                  fontWeight: 600, fontSize: "14px", textDecoration: "none",
                  display: "inline-flex", alignItems: "center",
                }}
              >
                View on GitHub ↗
              </a>
            </div>
          </div>

          {/* Live stats bar */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px", background: "var(--border)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}>
            {[
              { label: "Cycle Time", value: "~25s", sub: "per guard sweep" },
              { label: "Tx Cost", value: "~$0.01", sub: "USDC on Arc" },
              { label: "Guards", value: "5", sub: "independent checks" },
              { label: "Settlement", value: "<1s", sub: "Arc finality" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--bg-2)", padding: "20px",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: "26px",
                  fontWeight: 800, color: "var(--accent)",
                }}>{s.value}</div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "4px" }}>{s.label}</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: "11px",
                  color: "var(--text-3)", marginTop: "2px",
                }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.12em",
              color: "var(--text-3)", textTransform: "uppercase", marginBottom: "20px",
            }}>
              How It Works
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {[
                {
                  step: "01",
                  color: "var(--accent)",
                  title: "Connect & Enable Protection",
                  desc: "Connect your MetaMask wallet and enable protection in one click. The agent registers your wallet and begins monitoring immediately.",
                },
                {
                  step: "02",
                  color: "var(--clear)",
                  title: "5-Guard Risk Engine Runs Every 30s",
                  desc: "Drawdown · Volatility · RSI · Spread · Cooldown — five independent guards evaluate every asset. Claude AI reads the output and decides: BUY, SELL, or HOLD.",
                },
                {
                  step: "03",
                  color: "var(--caution)",
                  title: "CAUTION → Position Reduced",
                  desc: "When guards fire, Claude automatically reduces position sizes using the formula: 20% × 0.67^(flags raised). You get a WhatsApp message.",
                },
                {
                  step: "04",
                  color: "var(--halt)",
                  title: "HALT → Your Phone Rings",
                  desc: "On a HALT verdict, your tokens move to the GuardianVault smart contract automatically, all trading stops, and we call your phone. No manual action needed.",
                },
                {
                  step: "05",
                  color: "var(--accent)",
                  title: "Withdraw Anytime",
                  desc: "Your funds in the vault are always yours. Withdraw from the dashboard with one click — the agent never has custody.",
                },
              ].map((item, i, arr) => (
                <div key={item.step} style={{
                  display: "flex", gap: "20px", alignItems: "flex-start",
                  padding: "20px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: i === 0 ? "var(--radius-lg) var(--radius-lg) 0 0" :
                                i === arr.length - 1 ? "0 0 var(--radius-lg) var(--radius-lg)" : "0",
                  borderTop: i > 0 ? "none" : "1px solid var(--border)",
                }}>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: "11px",
                    color: item.color, fontWeight: 700,
                    minWidth: "24px", marginTop: "2px",
                  }}>{item.step}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontFamily: "var(--mono)", fontSize: "12px",
                      color: "var(--text-2)", lineHeight: 1.6,
                    }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guard engine */}
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.12em",
              color: "var(--text-3)", textTransform: "uppercase", marginBottom: "20px",
            }}>
              The 5-Guard Engine
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { name: "Drawdown", icon: "📉", desc: "HALT if portfolio down ≥12% from peak. CAUTION at 7%.", color: "var(--halt)" },
                { name: "Volatility", icon: "⚡", desc: "HALT if ATR ≥2.5× rolling average. CAUTION at 1.5×.", color: "var(--caution)" },
                { name: "RSI", icon: "📊", desc: "CAUTION if RSI >72 (overbought) or <28 (oversold).", color: "var(--accent)" },
                { name: "Spread", icon: "💧", desc: "CAUTION if bid-ask spread >0.5% — thin liquidity signal.", color: "var(--accent)" },
                { name: "Cooldown", icon: "⏱️", desc: "Skips entries for 5min after a stop-loss fires.", color: "var(--clear)" },
              ].map(g => (
                <div key={g.name} style={{
                  background: "var(--bg-2)", border: `1px solid ${g.color}20`,
                  borderRadius: "var(--radius-lg)", padding: "16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>{g.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: g.color }}>{g.name}</span>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-2)", lineHeight: 1.5 }}>
                    {g.desc}
                  </div>
                </div>
              ))}
              {/* Dead man's switch */}
              <div style={{
                background: "var(--bg-2)", border: "1px solid var(--halt)20",
                borderRadius: "var(--radius-lg)", padding: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "16px" }}>☠️</span>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--halt)" }}>Dead Man's Switch</span>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-2)", lineHeight: 1.5 }}>
                  If the agent crashes mid-cycle, all open orders cancel within 120 seconds automatically.
                </div>
              </div>
            </div>
          </div>

          {/* Built on */}
          <div style={{
            background: "var(--bg-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "24px",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.12em",
              color: "var(--text-3)", textTransform: "uppercase", marginBottom: "16px",
            }}>
              Built With
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                "Arc (Circle L1)", "USDC Settlement", "Claude AI",
                "Twilio Voice Calls", "GuardianVault.sol", "ThreatRegistry.sol",
                "RiskGuardOracle.sol", "Rust Guard Engine", "TypeScript Agent",
                "Viem", "React", "Hardhat",
              ].map(t => (
                <span key={t} style={{
                  fontFamily: "var(--mono)", fontSize: "11px",
                  background: "var(--bg-3)", border: "1px solid var(--border)",
                  color: "var(--text-2)", padding: "4px 10px", borderRadius: "4px",
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", paddingBottom: "40px" }}>
            <button onClick={onEnter} style={{
              background: "var(--accent-dim)", border: "1px solid var(--accent)60",
              color: "var(--accent)", padding: "14px 36px",
              borderRadius: "var(--radius)", cursor: "pointer",
              fontWeight: 700, fontSize: "15px",
            }}>
              🛡 Launch AgoraGuard
            </button>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "11px",
              color: "var(--text-3)", marginTop: "12px",
            }}>
              Arc Testnet · Chain ID 5042002 · No real funds at risk
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}