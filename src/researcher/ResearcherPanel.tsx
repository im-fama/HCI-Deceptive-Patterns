import { useEffect, useState } from "react";
import { firebaseConfigured, getFirebase } from "../lib/firebase";
import { researcherEmail, researcherSignIn, researcherSignOut } from "../lib/storage";
import type { Condition, Settings } from "../types";
import { EquivalenceTab } from "./EquivalenceTab";
import { SessionsTab } from "./SessionsTab";
import { SetupTab } from "./SetupTab";

type Tab = "sessions" | "equivalence" | "setup";
type Auth = "checking" | "open" | "signin" | "ok";

type Props = {
  onExit: () => void;
  onQuickDemo: (c: Condition) => void;
  onSettings: (s: Settings) => void;
};

export default function ResearcherPanel({ onExit, onQuickDemo, onSettings }: Props) {
  const [auth, setAuth] = useState<Auth>(firebaseConfigured ? "checking" : "open");
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sessions");

  useEffect(() => {
    if (!firebaseConfigured) return;
    void (async () => {
      const fb = await getFirebase();
      if (!fb) return setAuth("open"); // Firebase unreachable: local data only
      const e = await researcherEmail();
      setEmail(e);
      setAuth(e ? "ok" : "signin");
    })();
  }, []);

  if (auth === "checking") return <div className="rp status-msg">Checking sign-in…</div>;
  if (auth === "signin")
    return (
      <SignIn
        onBack={onExit}
        onSignedIn={(e) => {
          setEmail(e);
          setAuth("ok");
        }}
      />
    );

  const tabs: [Tab, string][] = [
    ["sessions", "Sessions"],
    ["equivalence", "Equivalence check"],
    ["setup", "Setup"],
  ];

  return (
    <div className="rp">
      <header className="rp-head">
        <div>
          <div className="eyebrow">STUDYNEST · RESEARCH TEAM</div>
          <h1>Researcher panel</h1>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          {email && <span className="status-msg">{email}</span>}
          {!firebaseConfigured && <span className="pill warn">Local only (no Firebase config)</span>}
          {email && (
            <button
              className="btn ghost sm"
              onClick={async () => {
                await researcherSignOut();
                setEmail(null);
                setAuth("signin");
              }}
            >
              Sign out
            </button>
          )}
          <button className="btn ghost sm" onClick={onExit}>
            Exit to study
          </button>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" className="tab-btn" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "sessions" && <SessionsTab />}
      {tab === "equivalence" && <EquivalenceTab />}
      {tab === "setup" && <SetupTab onQuickDemo={onQuickDemo} onSettings={onSettings} />}
    </div>
  );
}

function SignIn({ onSignedIn, onBack }: { onSignedIn: (email: string) => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="login"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await researcherSignIn(email, password);
          const signed = await researcherEmail();
          if (signed) onSignedIn(signed);
          else setError("Sign-in failed.");
        } catch (err) {
          setError(err instanceof Error ? err.message.replace("Firebase: ", "") : String(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="eyebrow">RESEARCH TEAM</div>
      <h1 className="title" style={{ fontSize: 24 }}>
        Sign in
      </h1>
      <label className="q-label" htmlFor="rp-email">
        Email
      </label>
      <input id="rp-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label className="q-label" htmlFor="rp-pass">
        Password
      </label>
      <input id="rp-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn primary" disabled={busy}>
          Sign in
        </button>
        <button type="button" className="btn ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </form>
  );
}
