import { escapeHtml } from "./safety.js";

export const FINAL_CARD_LINES = [
  "From scattered lore",
  "to creator-controlled canon.",
] as const;

const baseStyles = `
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
  body {
    color: #173c3e;
    background:
      radial-gradient(circle at 16% 12%, rgba(55,142,133,.18), transparent 32%),
      linear-gradient(135deg, #f8fbfb 0%, #edf6f4 100%);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .stage { display: grid; min-height: 100%; align-content: center; gap: 30px; padding: 86px 130px; }
  .kicker { color: #1f766e; font-size: 22px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
  h1 { max-width: 1320px; margin: 0; font-size: 72px; line-height: 1.04; letter-spacing: -.035em; }
  p { margin: 0; color: #4a6669; font-size: 30px; line-height: 1.45; }
  button { font: inherit; }
  .brand { position: fixed; top: 42px; left: 52px; display: flex; gap: 14px; align-items: center; color: #173c3e; font-weight: 900; }
  .brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: white; background: #21766f; }
  .footer-line { color: #1f766e; font-size: 25px; font-weight: 900; }
`;

function shell(content: string, extraStyles = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}${extraStyles}</style></head><body><div class="brand"><span class="brand-mark">CK</span><span>Creative Knowledge Engine</span></div>${content}</body></html>`;
}

export function scatteredLoreCard(): string {
  const fileNames = [
    "character-notes.md",
    "world-setting.md",
    "revision.json",
    "scene-draft.md",
  ];
  return shell(
    `<main class="stage">
      <div class="kicker">Every story grows its own lore</div>
      <h1>One story.<br>Four scattered sources.</h1>
      <div class="document-cloud">
        ${fileNames
          .map(
            (fileName, index) =>
              `<button data-file="${index}" type="button"><span>0${index + 1}</span>${escapeHtml(fileName)}</button>`,
          )
          .join("")}
      </div>
      <div class="footer-line">Scattered documents make canon harder to control.</div>
    </main>`,
    `
      .document-cloud { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; max-width: 1240px; }
      .document-cloud button { display: flex; gap: 22px; align-items: center; padding: 25px 30px; border: 1px solid #bcd5d1; border-radius: 18px; color: #294d50; background: rgba(255,255,255,.9); box-shadow: 0 16px 45px rgba(32,72,70,.09); text-align: left; font-size: 28px; font-weight: 850; transition: transform .25s, border-color .25s, background .25s; }
      .document-cloud button span { color: #278177; font-size: 18px; letter-spacing: .12em; }
      .document-cloud button.active { transform: translateY(-5px) rotate(-.5deg); border-color: #268278; background: #e4f4f0; }
      .document-cloud button:nth-child(2n).active { transform: translateY(-5px) rotate(.5deg); }
    `,
  );
}

export function canonConflictCard(): string {
  return shell(
    `<main class="stage conflict-stage">
      <div class="kicker">Duplicate or distinct?</div>
      <h1>Which version is canon?</h1>
      <div class="conflict-grid">
        <button type="button" data-version="nova"><strong>Nova</strong><span>Age 17</span><small>character-notes.md</small></button>
        <div class="versus">≠?</div>
        <button type="button" data-version="fullwidth"><strong>ＮＯＶＡ</strong><span>Age 18</span><small>revision.json</small></button>
      </div>
      <div class="missing-link">Relationship status: <strong>missing</strong></div>
    </main>`,
    `
      .conflict-stage { justify-items: center; text-align: center; }
      .conflict-grid { display: grid; grid-template-columns: 500px 90px 500px; gap: 18px; align-items: center; }
      .conflict-grid button { display: grid; gap: 16px; padding: 38px; border: 2px solid #bcd5d1; border-radius: 24px; color: #173c3e; background: white; box-shadow: 0 22px 60px rgba(31,71,69,.12); }
      .conflict-grid button strong { font-size: 48px; }
      .conflict-grid button span { color: #9a4e34; font-size: 34px; font-weight: 900; }
      .conflict-grid button small { color: #637c7f; font-size: 20px; }
      .conflict-grid button.active { border-color: #b35a3d; background: #fff3ec; transform: translateY(-5px); }
      .versus { color: #ad6045; font-size: 48px; font-weight: 900; }
      .missing-link { padding: 13px 22px; border-radius: 999px; color: #6d4a16; background: #fff0d4; font-size: 24px; }
    `,
  );
}

export function codexFinishCard(testCount: number): string {
  return shell(
    `<main class="stage finish-stage" data-finish-stage>
      <div class="kicker">Built for Build Week</div>
      <h1>Built with Codex.<br>Powered by GPT-5.6.</h1>
      <div class="build-grid">
        <span>Specification</span><span>Implementation</span><span>Tests</span><span>Fixes</span>
      </div>
      <p><strong>${testCount.toLocaleString("en-US")}</strong> automated tests support creator-controlled knowledge.</p>
    </main>`,
    `
      .finish-stage { justify-items: center; text-align: center; }
      .build-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; width: min(1180px, 100%); }
      .build-grid span { padding: 20px; border: 1px solid #bcd5d1; border-radius: 16px; background: rgba(255,255,255,.88); font-size: 23px; font-weight: 850; }
      .finish-stage p strong { color: #1f766e; font-size: 58px; }
      .final-card { display: grid; min-height: 100vh; place-items: center; align-content: center; gap: 18px; padding: 80px; color: white; background: linear-gradient(145deg, #153f42, #1f6b65); text-align: center; }
      .final-card h1 { font-size: 76px; line-height: 1.08; }
      .final-card p { color: #bfe1dc; font-size: 24px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    `,
  );
}

export function finalCardMarkup(): string {
  return `<main class="final-card"><p>Creative Knowledge Engine</p><h1>${escapeHtml(FINAL_CARD_LINES[0])}<br>${escapeHtml(FINAL_CARD_LINES[1])}</h1></main>`;
}
