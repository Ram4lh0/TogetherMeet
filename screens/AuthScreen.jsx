import { useState } from "react";
import { signUp, signIn } from "../services/api";
import { BASE, ACCENT, ACCENT_SOFT, ACCENT_DARK, BORDER, MUTED2, DISABLED_BG } from "../styles/theme";
import { buttonBase, inputStyle, modalCardStyle, labelStyle } from "../styles/styles";
import { ErrorBanner } from "../components/Shared";

export default function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!email.trim() || !password.trim()) { setError("Preenche email e password."); return; }
    if (mode === "register" && !displayName.trim()) { setError("Preenche o teu nome."); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        await signUp(email.trim(), password, displayName.trim());
        setSuccessMsg("Conta criada! Verifica o teu email para confirmar o registo.");
      } else {
        await signIn(email.trim(), password);
        onSuccess();
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...BASE, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: ACCENT_SOFT, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 16px", border: `1px solid ${BORDER}` }}>⚽</div>
          <h1 style={{ margin: 0, fontSize: 28, color: "#166534", letterSpacing: "-1px" }}>Organiza Eventos</h1>
          <p style={{ margin: "8px 0 0", color: MUTED2, fontSize: 13 }}>
            {mode === "login" ? "Entra na tua conta" : "Cria a tua conta"}
          </p>
        </div>

        <div style={modalCardStyle}>
          {error && <ErrorBanner message={error} />}
          {successMsg && (
            <div style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT}`, color: ACCENT_DARK, borderRadius: 14, padding: 12, fontSize: 13, marginBottom: 14 }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {mode === "register" && (
              <label style={labelStyle}>
                Nome
                <input
                  autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Pedro Salgado"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>
            )}

            <label style={labelStyle}>
              Email
              <input
                autoFocus={mode === "login"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="email@exemplo.com"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>

            <label style={labelStyle}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...buttonBase, background: loading ? DISABLED_BG : ACCENT, color: loading ? MUTED2 : "#fff", width: "100%", marginTop: 4, boxShadow: loading ? "none" : "0 14px 32px rgba(34,197,94,0.22)" }}
            >
              {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </div>

          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setSuccessMsg(null); }}
            style={{ background: "transparent", border: "none", color: ACCENT_DARK, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Sora', sans-serif", marginTop: 16, width: "100%", textAlign: "center" }}
          >
            {mode === "login" ? "Ainda não tens conta? Criar conta" : "Já tens conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
