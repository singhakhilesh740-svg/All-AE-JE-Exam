/* ===== Reset & Base ===== */
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-2: #334155;
  --border: #334155;
  --text: #f1f5f9;
  --text-dim: #94a3b8;
  --accent: #f59e0b;
  --accent-dim: #b45309;
  --success: #10b981;
  --error: #ef4444;
  --radius: 12px;
  --radius-sm: 8px;

  /* tile accent colours */
  --notes-color: #3b82f6;
  --practice-color: #10b981;
  --pyq-color: #f59e0b;
  --bm-color: #a855f7;
}

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  overflow-x: hidden;
}

button { font: inherit; color: inherit; border: none; background: none; cursor: pointer; }

/* ===== Screen system ===== */
.screen { display: none; min-height: 100vh; }
.screen.active { display: flex; flex-direction: column; }
.hidden { display: none !important; }

/* ===== Login ===== */
#loginScreen {
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}
.login-card {
  background: var(--surface);
  padding: 40px 28px;
  border-radius: var(--radius);
  text-align: center;
  width: 100%;
  max-width: 360px;
  border: 1px solid var(--border);
}
.logo { font-size: 56px; margin-bottom: 12px; }
.login-card h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.tagline { color: var(--accent); font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.subtitle { color: var(--text-dim); font-size: 13px; margin-bottom: 32px; }
.btn-google {
  width: 100%;
  background: #fff;
  color: #1f2937;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.1s;
}
.btn-google:active { transform: scale(0.98); }
.footer-note { color: var(--text-dim); font-size: 12px; margin-top: 24px; }

/* ===== App Header ===== */
.app-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  gap: 4px;
}
.header-left h2 { font-size: 18px; font-weight: 700; color: var(--accent); }
.header-sub { font-size: 12px; color: var(--text-dim); }
.header-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.avatar { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--accent); }
.btn-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-dim);
  transition: background 0.15s;
  flex-shrink: 0;
}
.btn-icon:active { background: var(--surface-2); }

/* ===== Welcome Strip ===== */
.welcome-strip {
  padding: 12px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.welcome-strip p { font-size: 14px; color: var(--text-dim); }
#userName { color: var(--accent); font-weight: 600; }

/* ===== HOME: 2x2 Tile Grid ===== */
.home-main { flex: 1; padding: 20px 16px; overflow-y: auto; }

.home-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.home-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 22px 16px 20px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
  transition: transform 0.12s, border-color 0.15s, background 0.15s;
  position: relative;
  overflow: hidden;
}
.home-tile::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: var(--radius) var(--radius) 0 0;
}
.home-tile:active { transform: scale(0.96); background: var(--surface-2); }

.tile-notes::before   { background: var(--notes-color); }
.tile-practice::before { background: var(--practice-color); }
.tile-pyq::before     { background: var(--pyq-color); }
.tile-bookmarks::before { background: var(--bm-color); }

.tile-icon { font-size: 32px; margin-bottom: 10px; }
.tile-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.tile-sub { font-size: 11px; color: var(--text-dim); line-height: 1.4; }

.tile-notes .tile-title   { color: var(--notes-color); }
.tile-practice .tile-title { color: var(--practice-color); }
.tile-pyq .tile-title     { color: var(--pyq-color); }
.tile-bookmarks .tile-title { color: var(--bm-color); }

/* ===== Subject / Exam Lists ===== */
.subjects-main { flex: 1; padding: 14px 16px; overflow-y: auto; }
.subjects-list { display: flex; flex-direction: column; gap: 10px; }

.subject-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  padding: 16px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  text-align: left;
  width: 100%;
  transition: all 0.15s;
}
.subject-card:active { transform: scale(0.98); border-color: var(--accent); background: var(--surface-2); }

.subject-icon {
  font-size: 26px;
  flex-shrink: 0;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}
.subject-info { flex: 1; min-width: 0; }
.subject-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.subject-desc { font-size: 12px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.subject-count {
  font-size: 11px; font-weight: 700;
  background: var(--surface-2);
  padding: 2px 8px;
  border-radius: 12px;
  color: var(--text-dim);
  flex-shrink: 0;
}
.subject-arrow { font-size: 20px; color: var(--accent); flex-shrink: 0; }

/* Exam cards (PYQ exam list) */
.exam-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  padding: 18px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  text-align: left;
  width: 100%;
  transition: all 0.15s;
}
.exam-card:active { transform: scale(0.98); border-color: var(--accent); background: var(--surface-2); }
.exam-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}
.exam-info { flex: 1; min-width: 0; }
.exam-name { font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 2px; }
.exam-state { font-size: 12px; color: var(--text-dim); }
.exam-arrow { font-size: 22px; color: var(--accent); flex-shrink: 0; }

/* ===== Topic Bar (scrollable chips) ===== */
.topic-bar-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 10px 16px 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 5;
}
.topic-bar-scroll::-webkit-scrollbar { display: none; }
.topic-bar-scroll:empty { display: none; }

.topic-chip {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 500;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.topic-chip.active {
  background: var(--accent);
  color: #1a1500;
  border-color: var(--accent);
  font-weight: 700;
}
.topic-chip:active { opacity: 0.8; }

/* ===== Notes Content ===== */
.notes-container { display: flex; flex-direction: column; gap: 20px; }
.notes-section { display: flex; flex-direction: column; gap: 12px; }
.notes-topic-header {
  font-size: 15px; font-weight: 700; color: var(--accent);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-top: 8px; padding-bottom: 6px;
  border-bottom: 2px solid var(--accent);
}
.notes-card {
  background: var(--surface);
  border-left: 4px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 10px;
}
.notes-card-blue   { border-left-color: #3b82f6; }
.notes-card-purple { border-left-color: #a855f7; }
.notes-card-green  { border-left-color: #10b981; }
.notes-card-orange { border-left-color: #f97316; }

.notes-card-heading {
  font-size: 13px; font-weight: 700; color: var(--accent);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.notes-formula { margin-bottom: 12px; }
.notes-formula-label { font-size: 11px; font-weight: 600; color: var(--accent); text-transform: uppercase; margin-bottom: 4px; }
.notes-formula-text {
  background: #0a1122; border: 1px solid var(--border); border-radius: 4px;
  padding: 10px 12px; font-size: 12px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  color: var(--text-dim); overflow-x: auto; margin: 0;
  white-space: pre-wrap; word-break: break-word;
}
.notes-points { list-style: none; padding: 0; margin: 10px 0; }
.notes-points li {
  font-size: 13px; color: var(--text-dim); line-height: 1.6;
  margin-bottom: 7px; padding-left: 18px; position: relative;
}
.notes-points li::before { content: '•'; position: absolute; left: 3px; color: var(--accent); font-weight: 700; }
.notes-table-wrapper { overflow-x: auto; margin: 10px 0; border-radius: 4px; border: 1px solid var(--border); }
.notes-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.notes-table thead { background: var(--surface-2); border-bottom: 2px solid var(--border); }
.notes-table th { padding: 9px 12px; text-align: left; font-weight: 700; color: var(--accent); }
.notes-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--text-dim); }
.notes-table tbody tr:last-child td { border-bottom: none; }
.notes-alert {
  background: rgba(239,68,68,0.08); border-left: 3px solid #ef4444;
  border-radius: 4px; padding: 12px 14px; margin-top: 10px;
  font-size: 13px; color: var(--text-dim); line-height: 1.5;
}
.notes-image { max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px; border: 1px solid var(--border); }

/* ===== Bookmarks ===== */
.bookmarks-main { flex: 1; padding: 14px 16px; overflow-y: auto; }
.bookmarks-list { display: flex; flex-direction: column; gap: 8px; }
.practice-all-btn {
  width: 100%;
  background: var(--accent); color: #1f2937;
  padding: 12px; border-radius: var(--radius);
  font-weight: 600; font-size: 14px;
  margin-bottom: 14px;
  transition: transform 0.1s;
}
.practice-all-btn:active { transform: scale(0.98); }
.bookmark-card {
  display: flex; align-items: flex-start; gap: 12px;
  background: var(--surface); padding: 14px;
  border-radius: var(--radius); border: 1px solid var(--border);
  text-align: left; width: 100%; transition: all 0.15s;
}
.bookmark-card:active { transform: scale(0.98); border-color: var(--accent); background: var(--surface-2); }
.bookmark-num {
  font-size: 12px; font-weight: 700; color: var(--accent);
  background: var(--surface-2); border-radius: 50%;
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.bookmark-content { flex: 1; min-width: 0; }
.bookmark-subject { font-size: 10px; color: var(--accent); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
.bookmark-text { font-size: 13px; color: var(--text); line-height: 1.5; }
.bookmark-arrow { font-size: 18px; color: var(--text-dim); flex-shrink: 0; }

/* ===== Quiz Screen ===== */
.quiz-header {
  display: flex; align-items: center;
  padding: 12px 14px; gap: 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.quiz-header-center { flex: 1; display: flex; flex-direction: column; gap: 5px; align-items: center; }
.quiz-progress-bar { width: 100%; height: 4px; background: var(--surface-2); border-radius: 2px; overflow: hidden; }
.quiz-progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }
.quiz-progress-text { font-size: 12px; font-weight: 600; color: var(--text-dim); }

#quizBookmarkBtn[data-marked="1"] { color: var(--accent); }

.quiz-main { flex: 1; padding: 18px 16px; overflow-y: auto; }

.quiz-meta { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
.quiz-meta span {
  background: var(--surface); color: var(--text-dim);
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  border: 1px solid var(--border);
}

.quiz-question { font-size: 16px; font-weight: 500; line-height: 1.65; margin-bottom: 22px; }
.quiz-options { display: flex; flex-direction: column; gap: 10px; }

.quiz-option {
  background: var(--surface); padding: 13px 14px;
  border-radius: var(--radius-sm); border: 1px solid var(--border);
  text-align: left; font-size: 14px;
  display: flex; gap: 10px; align-items: flex-start;
  transition: all 0.15s;
}
.quiz-option:active { background: var(--surface-2); }
.quiz-option.correct { border-color: var(--success); background: rgba(16,185,129,0.1); }
.quiz-option.wrong   { border-color: var(--error);   background: rgba(239,68,68,0.1); }
.opt-letter { font-weight: 700; color: var(--accent); flex-shrink: 0; }

.quiz-explanation {
  margin-top: 20px; padding: 14px;
  background: var(--surface);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
}
.quiz-explanation h4 { font-size: 12px; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
.quiz-explanation p  { font-size: 13px; color: var(--text-dim); line-height: 1.6; }

.quiz-footer {
  display: flex; gap: 10px;
  padding: 12px 16px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.btn-primary, .btn-secondary {
  flex: 1; padding: 12px;
  border-radius: var(--radius-sm);
  font-weight: 600; font-size: 14px;
  transition: transform 0.1s;
}
.btn-primary  { background: var(--accent); color: #1f2937; }
.btn-secondary { background: var(--surface-2); color: var(--text); }
.btn-primary:active, .btn-secondary:active { transform: scale(0.98); }
.btn-primary:disabled, .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== Empty State ===== */
.empty-state {
  text-align: center; padding: 40px 20px;
  background: var(--surface);
  border-radius: var(--radius); border: 1px solid var(--border);
  margin-top: 16px;
}
.empty-icon { font-size: 52px; margin-bottom: 14px; }
.empty-state h3 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
.empty-state p { font-size: 13px; color: var(--text-dim); margin-bottom: 6px; }
.hint-small { font-size: 11px !important; color: var(--text-dim); opacity: 0.7; margin-top: 14px !important; }
.hint-small code { background: var(--surface-2); padding: 2px 6px; border-radius: 4px; color: var(--accent); font-size: 11px; }

/* ===== Toast ===== */
.toast {
  position: fixed; bottom: 30px; left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: var(--surface-2); color: var(--text);
  padding: 12px 20px; border-radius: var(--radius-sm);
  font-size: 14px; opacity: 0; transition: all 0.3s;
  z-index: 1000; border: 1px solid var(--accent);
  pointer-events: none;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ===== Responsive ===== */
@media (max-width: 380px) {
  .home-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .home-tile { padding: 18px 12px 16px; }
  .tile-icon { font-size: 26px; }
  .tile-title { font-size: 13px; }
}
