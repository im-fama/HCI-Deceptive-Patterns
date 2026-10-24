import type { Condition } from "../../types";
import { app, weekday } from "../copy";
import { Lock, TabIcon } from "../icons";

type Props = {
  mode: Condition;
  plusActive: boolean;
  /** True once the participant has left the paywall without subscribing. */
  freePlan: boolean;
  onDeck: (deck: string) => void;
  onLocked: () => void;
  onDone: () => void;
};

export function Home({ mode, plusActive, freePlan, onDeck, onLocked, onDone }: Props) {
  const h = app.home;
  return (
    <div className="sn-screen home">
      {mode === "ios" ? (
        <header className="home-head">
          <div className="home-kicker">{weekday()}</div>
          <h1 className="home-title">{h.title}</h1>
        </header>
      ) : (
        <header className="home-head">
          <h1 className="home-title">{h.title}</h1>
          <span className="home-avatar" aria-hidden="true">
            {h.avatar}
          </span>
        </header>
      )}

      <div className="home-scroll">
        {freePlan && (
          <div className="home-banner" role="status">
            {h.freePlan}
          </div>
        )}
        <h2 className="home-sec">{h.dueToday}</h2>
        <div className="home-list">
          {h.decks.map((d) => (
            <button key={d.id} className="home-card" data-id={`deck-${d.id}`} onClick={() => onDeck(d.id)}>
              <span className="deck-icon" style={{ background: d.color }} aria-hidden="true">
                {d.letter}
              </span>
              <span className="card-text">
                <span className="card-title">{d.name}</span>
                <span className="card-meta">{d.meta}</span>
              </span>
            </button>
          ))}
        </div>

        <h2 className="home-sec">{h.examPrep}</h2>
        <div className="home-list">
          <button className="home-card" data-id="locked-tests" onClick={onLocked}>
            <span className="deck-icon tests" aria-hidden="true">
              <Lock size={16} />
            </span>
            <span className="card-text">
              <span className="card-title">{h.testsTitle}</span>
              <span className="card-meta">{plusActive ? h.plusActive : h.testsMeta}</span>
            </span>
            {!plusActive && (
              <span className="plus-pill">
                <Lock size={10} /> {h.plusPill}
              </span>
            )}
          </button>
        </div>

        {freePlan && (
          <div className="home-done">
            <button className="sn-btn primary" data-id="finish" onClick={onDone}>
              {h.done}
            </button>
          </div>
        )}
      </div>

      <nav className="tabbar" aria-hidden="true">
        {h.tabs.map((t, i) => (
          <span key={t} className={`tab ${i === 0 ? "active" : ""}`}>
            <span className="tab-ico">
              <TabIcon i={i} />
            </span>
            <span className="tab-label">{t}</span>
          </span>
        ))}
      </nav>
    </div>
  );
}
