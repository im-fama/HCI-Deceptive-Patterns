import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { assignCondition } from "./lib/assignment";
import { deviceInfo } from "./lib/device";
import { makeParticipantId } from "./lib/ids";
import { Logger } from "./lib/logger";
import { computeMetrics } from "./lib/metrics";
import { DEFAULT_SETTINGS, getSettings, markPreviousAbandoned, saveSession, setCurrentSession } from "./lib/storage";
import { Background } from "./study/Background";
import { Consent } from "./study/Consent";
import { Debrief } from "./study/Debrief";
import { PostQuestionnaire } from "./study/PostQuestionnaire";
import { TaskIntro } from "./study/TaskIntro";
import { Welcome } from "./study/Welcome";
import { computeTrialEnd } from "./studynest/copy";
import { StaticPaywall, StudyNestApp } from "./studynest/StudyNestApp";
import type { Background as Bg, Condition, LogEvent, Post, Session, Settings } from "./types";

const ResearcherPanel = lazy(() => import("./researcher/ResearcherPanel"));

type Step = "welcome" | "consent" | "background" | "task" | "app" | "post" | "debrief" | "researcher";

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("v");
  return {
    v: v === "ios" || v === "md" ? (v as Condition) : null,
    shot: params.get("shot") === "paywall",
    researcher: params.get("researcher") === "1" || window.location.hash === "#researcher",
  };
}

export default function App() {
  const url = useRef(readUrl()).current;

  // Debug route for analysis/screenshots.py: static paywall, no logging, no session.
  if (url.shot) return <StaticPaywall mode={url.v ?? "ios"} trialEnd={computeTrialEnd()} />;

  return <Study initialResearcher={url.researcher} urlCondition={url.v} />;
}

function Study({ initialResearcher, urlCondition }: { initialResearcher: boolean; urlCondition: Condition | null }) {
  const [step, setStep] = useState<Step>(initialResearcher ? "researcher" : "welcome");
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const logger = useRef<Logger | null>(null);

  useEffect(() => {
    void markPreviousAbandoned();
    void getSettings().then(setSettings);
  }, []);

  // Participants must not move between steps with the browser back button.
  useEffect(() => {
    if (step === "researcher") return;
    history.pushState({ sn: true }, "", window.location.href);
    const onPop = () => history.pushState({ sn: true }, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [step]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  async function persist(s: Session) {
    setSession(s);
    await saveSession(s);
  }

  function newSession(demo: boolean): Session {
    return {
      id: makeParticipantId(),
      startedAt: new Date().toISOString(),
      status: "started",
      demo,
      condition: null,
      assignment: null,
      ...deviceInfo(),
      events: [],
    };
  }

  function start() {
    setSession(newSession(settings.demoMode || urlCondition !== null));
    setStep("consent");
  }

  async function finishBackground(bg: Bg) {
    if (!session) return;
    setBusy(true);
    try {
      const a = await assignCondition(bg.own, settings, urlCondition);
      const s: Session = { ...session, bg, ...a, status: "assigned", trialEnd: computeTrialEnd() };
      setCurrentSession(s.id);
      await persist(s);
      setStep("task");
    } finally {
      setBusy(false);
    }
  }

  async function quickDemo(condition: Condition) {
    const s: Session = {
      ...newSession(true),
      condition,
      assignment: "demo-forced",
      status: "assigned",
      trialEnd: computeTrialEnd(),
    };
    setCurrentSession(s.id);
    await persist(s);
    setStep("task");
  }

  function openApp() {
    logger.current = new Logger(true);
    setStep("app");
  }

  async function finishTask(events: LogEvent[]) {
    if (!session) return;
    setStep("post");
    await persist({ ...session, events: [...events], metrics: computeMetrics(events), status: "task_done" });
  }

  async function finishPost(post: Post) {
    if (!session) return;
    setBusy(true);
    try {
      await persist({ ...session, post, status: "complete", completedAt: new Date().toISOString() });
      setCurrentSession(null);
      setStep("debrief");
    } finally {
      setBusy(false);
    }
  }

  switch (step) {
    case "welcome":
      return <Welcome onStart={start} onResearcher={() => setStep("researcher")} />;
    case "consent":
      return (
        <Consent
          onAgree={() => {
            setSession((s) => (s ? { ...s, consentAt: new Date().toISOString() } : s));
            setStep("background");
          }}
          onBack={() => setStep("welcome")}
        />
      );
    case "background":
      return <Background onDone={finishBackground} busy={busy} />;
    case "task":
      return <TaskIntro participantId={session!.id} onOpen={openApp} />;
    case "app":
      return <StudyNestApp mode={session!.condition!} logger={logger.current!} trialEnd={session!.trialEnd!} onDone={finishTask} />;
    case "post":
      return <PostQuestionnaire onDone={finishPost} busy={busy} />;
    case "debrief":
      return <Debrief participantId={session!.id} />;
    case "researcher":
      return (
        <Suspense fallback={<div className="rp status-msg">Loading…</div>}>
          <ResearcherPanel
            onExit={() => {
              if (window.location.hash === "#researcher") history.replaceState(null, "", window.location.pathname);
              void getSettings().then(setSettings);
              setStep("welcome");
            }}
            onQuickDemo={quickDemo}
            onSettings={setSettings}
          />
        </Suspense>
      );
  }
}
