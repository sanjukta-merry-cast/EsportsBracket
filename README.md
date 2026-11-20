# EsportsBracket — Tournament Bracket Generator & Live Match Results Dashboard

**Project ID / Track:** PST_PD_041  
**Batch / Level:** 2026 Level 3 (Stretch)  
**Team Members:** Sanjukta Kalita & Akshat Kumar  

---

## 1. Project Overview & Problem Statement

At college esports competitions and LAN tournaments (e.g., *CampusClash 2026* with 12 teams), tournament coordinators traditionally manage brackets on whiteboards and announce match calls via chaotic WhatsApp groups. 

### The Problem
* **Whiteboard Erase Errors:** When multiple quarter-final matches conclude simultaneously, organizers easily erase or write over the wrong lines, resulting in eliminated teams being mistakenly called to the main stage.
* **Manual BYE Math:** Determining fair pairings and seeding by hand when team counts are not an exact power of 2 (such as 12 teams) creates disputes.
* **Disorganized Players:** Gamers waiting in dorms constantly scroll through noisy group chats asking *"Who do we play next and when?"*, frequently missing call times.

### The EsportsBracket Solution
**EsportsBracket** is a responsive, web-based tournament bracket engine and live dashboard:
1. **Automated Seeding & BYEs:** Organizers paste 4–16 team names. The app automatically sizes the bracket to the next power of 2 ($4, 8, \text{or } 16$), places byes for top seeds, and creates the single-elimination bracket in seconds.
2. **Instant Score Entry & Auto-Advancement:** Organizers click a match, mark it **LIVE**, and enter final scores. Winning teams advance automatically to subsequent rounds.
3. **Live Spectator & Hall Dashboard:** Gamers can follow their team to receive an instant *"Your next match: Round X vs Team Y — Up next"* notification. Audience screens show a rolling results ticker, live scores, and a celebratory champion banner—updating automatically across tabs without manual page reloads.

---

## 2. Features & Functionality

### Core (Must-Have MVP)
* **Single-Elimination Bracket Engine:** Supports 4, 5, 8, 12, and 16 teams with mathematically sound pairing trees.
* **Automatic BYE Allocation:** Non-power-of-2 team counts receive byes for top-seeded teams (e.g., seeds 1–4 skip directly to Round 2 in a 12-team event).
* **Pre-Publish Team Swapping:** Organizers can reorder seed positions before locking in the bracket.
* **Match Life-Cycle Management:** Transitions seamlessly from `Upcoming` $\rightarrow$ `Live` $\rightarrow$ `Done`.
* **Score Validation:** Enforces no draws and strict Best-of-3 rules (winner must have exactly 2 map wins).
* **Downstream Cascade Reset:** Correcting a past result prompts a confirmation warning (`"Changing this result will reset X later match(es). Continue?"`) and safely resets downstream matches to preserve bracket integrity.
* **Multi-Tab Live Synchronization:** Spectator tabs update in real-time when the organizer saves a result in another tab using the browser `storage` event and a 5-second polling fallback.
* **Data Persistence:** All tournaments, match records, and user sessions persist across browser refreshes using `localStorage`.
* **Responsive Layout:** Adaptive Bootstrap 5 design featuring mobile round navigation tabs for phones and an event hall Projector Mode with enlarged fonts ($\ge 24\text{px}$).
* **Role-Based Views:** Instant switching between **Host Mode** (admin controls unlocked) and **Viewer Mode** (read-only with team tracking).

### Enhancements (Good-to-Have)
* **Matches Table (S6):** Filter all matches by Round or Status, and search in real-time by team name.
* **CSV Report Export:** Download complete tournament records as a `.csv` spreadsheet for event record-keeping.
* **Follow-a-Team Card:** Gamers track their team status, next opponent, and call time or elimination status.

---

## 3. Technology Stack

* **Markup:** HTML5 (Semantic elements, accessible ARIA attributes)
* **Styling:** CSS3 & Bootstrap 5 (Custom Dark Esports design tokens, CSS Grid/Flexbox)
* **Scripting:** Vanilla JavaScript (ES6+, DOM manipulation, Custom Events, No bundlers or frameworks)
* **Persistence:** Browser `localStorage` (Wrapped in `store.js` with `try/catch` and fallback memory mode)
* **Icons:** Bootstrap Icons (CDN)

---

## 4. Project Folder Structure

```text
EsportsBracket/
├── index.html                  # Single-page shell with S1–S6 screen views
├── README.md                   # Complete documentation, setup & testing instructions
├── css/
│   └── style.css               # Dark esports theme, mobile tabs, ticker, projector styles
├── js/
│   ├── store.js                # LocalStorage abstraction, error handling, session management
│   ├── bracket.js              # Pure bracket generation, seeding, byes, winner progression
│   └── live.js                 # Cross-tab sync engine, results ticker, CSV export
├── assets/
│   └── data/
│       └── sample-data.json    # Initial sample tournaments (1 live 12-team, 1 completed 8-team)
├── docs/
│   ├── PRD EsportsBracket (PST_PD_041).pdf
│   └── EsportsBracket_Project_Overview.pdf
└── wireframes/                 # UI wireframe specifications
```

---

## 5. Local Setup & Installation

No build steps, Node.js packages, or local servers are required!

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/EsportsBracket.git
   cd EsportsBracket
   ```
2. **Open in your browser:**
   * Double-click `index.html` to open directly in Chrome, Firefox, Safari, or Edge.
   * Or use VS Code's **Live Server** extension: right-click `index.html` and select **"Open with Live Server"**.

---

## 6. How to Use Host Mode vs. Viewer Mode

Use the **Role Switcher** dropdown located in the top navigation bar to toggle between roles:

### Host Mode (Organizers)
* Click **"+ New Tournament"** in the navbar to open Screen S2.
* Paste 4–16 team names, select seeding method (*By Rank* or *Random*), and click **"Generate Bracket Preview"**.
* Swap seeds if necessary, then click **"Publish Tournament & Go Live"**.
* In Screen S3 (Bracket View), click any match to open the right-side **Match Panel (S4)**.
* Click **"Start Match"** to mark it `LIVE`.
* Adjust scores using the `+` / `-` steppers and click **"Save Result & Advance Winner"**.
* If a mistake was made, click the completed match, correct the score, and confirm the downstream reset prompt.

### Viewer Mode (Gamers & Audience)
* Host action buttons (such as "+ New Tournament" and score entry drawers) are hidden or read-only.
* Navigate to **Live Dashboard (S5)** to watch active matches and recent ticker results.
* Use **"Follow Your Team"** to select your team and view your upcoming match or elimination message.
* Click **"Projector Mode"** on large monitors or hall projectors for high-visibility fullscreen viewing.
* Navigate to **Matches Table (S6)** to search teams, filter by round, or download match results via **"Export CSV"**.

---

## 7. Testing Instructions & Sample Data

### Demonstration Scenario: Multi-Tab Live Updates
1. Open `index.html` in **two separate tabs** of the same browser.
2. In **Tab 1**, ensure the role is set to **Host Mode** and navigate to the tournament bracket.
3. In **Tab 2**, switch the role to **Viewer Mode** and navigate to **Live Dashboard (S5)**. Select `Team Nova` in the "Follow Your Team" dropdown.
4. In **Tab 1**, click a match (e.g., `R1-M3`), change the score to `13–9`, and click **"Save Result"**.
5. Observe **Tab 2**: within seconds, the ticker updates, the bracket advances, and the live dashboard syncs without refreshing the page!

---

## 8. Division of Responsibilities

| Student | Assigned Core Scope | Implemented Deliverables |
| :--- | :--- | :--- |
| **Sanjukta Kalita** | • `bracket.js`<br>• Screen S2 (Create Tournament)<br>• Screen S4 (Match Panel) | Single-elimination tree algorithm, power-of-2 calculation, automatic byes, seeding swap, score validation (no draws, Bo3 rules), and downstream cascade reset. |
| **Akshat Kumar** | • `live.js`<br>• Screen S1 (Tournaments List)<br>• Screen S3 (Bracket View)<br>• Screen S5 (Live Dashboard)<br>• Screen S6 (Matches Table) | Cross-tab `storage` synchronization, 5-second polling fallback, mobile round tabs navigation, results ticker feed, "Follow a Team" status card, projector mode, and CSV export. |
| **Shared** | • `store.js`<br>• `css/style.css` | LocalStorage architecture, initial seed data loader, accessibility focus styling, and dark esports color palette. |

---

## 9. Current Limitations & Future Improvements

### Current Prototype Scope
* **Client-Side Live Sync:** Live synchronization operates across tabs/windows of the same browser using `window.addEventListener('storage', ...)`. It does not broadcast across distinct physical devices over the internet.
* **Role Check Security:** Role switching is intended for presentation and demo purposes; production systems would enforce server-side authentication (JWT/OAuth).

### Future Roadmap
1. **Backend & WebSockets:** Connect to a Node.js / Python WebSocket backend for real-time updates across multiple spectator phones and laptops.
2. **Double Elimination & Swiss Formats:** Expand tournament bracket options beyond single elimination.
3. **Publisher API Integration:** Connect to official game APIs (e.g., Riot Games API) to pull live match scores automatically.
4. **Push Notifications:** Implement Web Push API / Service Workers to send push notifications when a team's match is called.

---

## 10. License & Credits

Built as a college capstone project for **PST_PD_041**.  
Developed with HTML5, CSS3, Vanilla JavaScript, and Bootstrap 5.
