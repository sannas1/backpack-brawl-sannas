"""Builds docs/TECHNICAL.html: a technical explanation of every requirement (B1-B7).

The code excerpts and line numbers are read from the real source files, so they always match the code.
Usage (from the project folder):  python3 docs/make_technical_html.py
"""
import html
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "https://github.com/sannas1/backpack-brawl-sannas"
SHA = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()


# ---------------------------------------------------------------- helpers: read code from the real files
def find(src, pattern, after=0):
    return next(i for i in range(after, len(src)) if re.search(pattern, src[i]))


def block_end(src, start):
    """Index of the line where the braces opened at/after `start` close again."""
    depth, opened = 0, False
    for i in range(start, len(src)):
        depth += src[i].count("{") - src[i].count("}")
        opened = opened or "{" in src[i]
        if opened and depth <= 0:
            return i
    return start


def snippet(file, start_pattern, lines=None, upto=None):
    """Code from `file`, starting at the first line matching `start_pattern`.
    - `lines`: take exactly this many lines
    - `upto`: continue until the end of the block that starts at the line matching `upto`
    - neither: the block that starts at `start_pattern` (a whole function)"""
    src = (ROOT / file).read_text().splitlines()
    start = find(src, start_pattern)
    if lines:
        end = start + lines - 1
    elif upto:
        end = block_end(src, find(src, upto, start))
    else:
        end = block_end(src, start)
    code = "\n".join(src[start : end + 1])
    return file, start + 1, end + 1, code


def code_box(file, start_pattern, lines=None, note="", upto=None):
    file, a, b, code = snippet(file, start_pattern, lines, upto)
    url = f"{REPO}/blob/{SHA}/{file}#L{a}-L{b}"
    head = f'<a href="{url}" target="_blank"><code>{file}:{a}–{b}</code></a>'
    note = f'<span class="note">{note}</span>' if note else ""
    return f'<figure class="code"><figcaption>{head}{note}</figcaption><pre><code>{html.escape(code)}</code></pre></figure>'


def tests(file, describe):
    """List of test names inside `describe(...)` of a test file."""
    src = (ROOT / file).read_text().splitlines()
    names, inside = [], False
    for line in src:
        d = re.match(r'describe\("([^"]+)"', line)
        if d:
            inside = d.group(1) == describe
            continue
        t = re.match(r'\s+it(?:\.each\(.*)?\("([^"]+)"', line)
        if inside and t:
            names.append(t.group(1))
        elif inside and re.match(r"\s+it\.each", line):
            names.append("rejects invalid / implausible runs (9 cases: it.each)")
    items = "".join(f"<li><code>{html.escape(n)}</code></li>" for n in names)
    return f'<div class="tests"><b>Tests</b> – <code>{file}</code> › „{describe}“<ul>{items}</ul></div>'


def commit(sha, text=None):
    return f'<a class="commit" href="{REPO}/commit/{sha}" target="_blank">{text or sha}</a>'


def files(*rows):
    body = "".join(f"<tr><td><code>{f}</code></td><td>{what}</td></tr>" for f, what in rows)
    return f'<table class="files"><tr><th>Datei</th><th>Was wurde gemacht</th></tr>{body}</table>'


def section(id_, title, weight, branch, commits, requirement, before, how, why, code, test_html, questions):
    qa = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in questions)
    commit_links = " · ".join(commit(c) for c in commits)
    return f"""
<section id="{id_}">
  <h2>{title} <span class="weight">{weight}</span></h2>
  <p class="meta">Branch <code>{branch}</code> · Commit {commit_links}</p>
  <div class="req"><b>Anforderung (kurz):</b> {requirement}</div>
  <h3>Vorher (Starter-Code)</h3>{before}
  <h3>Was wurde wo geändert</h3>{how}
  <h3>Warum so?</h3>{why}
  <h3>Der Code</h3>{code}
  <h3>Wie wurde es geprüft?</h3>{test_html}
  <h3>Mögliche Prüfungsfragen</h3>{qa}
</section>"""


# ---------------------------------------------------------------- content
B1 = section(
    "b1", "B1 – Shop-Ökonomie", "10 %", "feature/b1-shop-economy", ["d7171e4"],
    "Items für den halben Preis (abgerundet) verkaufen, Shop für 1 🪙 neu würfeln. Gold nie negativ, kein Item geht verloren oder "
    "wird verdoppelt, jede Aktion passiert ganz oder gar nicht. Die Oberfläche sagt <i>vorher</i>, warum etwas nicht geht – und dieselbe "
    "Regel schützt die Aktion selbst. Nur im Shop möglich.",
    "<p>Es gab nur <code>buyBlocker</code>/<code>buyItem</code>. Kein Verkaufen, kein Reroll. <b>Bug im Starter:</b> Bei vollem Rucksack "
    "liefert <code>firstFreeSlot</code> den Wert <code>-1</code>; <code>buyItem</code> schrieb dann in <code>backpack[-1]</code> – "
    "Gold weg, Item weg.</p>",
    files(
        ("src/run.ts", "<code>sellPrice</code>, <code>sellBlocker</code>, <code>sellItem</code>, <code>rerollBlocker</code>, "
                       "<code>rerollShop</code>, Konstante <code>REROLL_COST</code>; <code>buyBlocker</code> prüft jetzt „Backpack is full“"),
        ("src/components/Shop.tsx", "Reroll-Button, der den Blocker-Text anzeigt und deaktiviert ist"),
        ("src/components/Backpack.tsx", "Item auswählen → „Sell for X 🪙“-Button"),
        ("src/pages/ShopPage.tsx", "Hilfsfunktion <code>act()</code> verbindet die Buttons mit den Regeln"),
        ("src/rules.ts", "Regeltext für Reroll und Verkaufen"),
    ),
    "<ul><li><b>Ein „Blocker“ pro Aktion:</b> Jede Aktion hat eine Funktion, die den Grund liefert, warum sie nicht geht (oder "
    "<code>null</code>). Die Oberfläche zeigt diesen Text auf dem deaktivierten Button, und die Aktion ruft <i>dieselbe</i> Funktion auf "
    "und gibt bei einem Grund den unveränderten Zustand zurück. So können UI und Regel nie auseinanderlaufen.</li>"
    "<li><b>Ganz oder gar nicht:</b> Die Funktionen sind <i>pure</i>: Sie ändern nichts, sondern geben ein neues Objekt zurück. Entweder "
    "kommt der komplette neue Zustand zurück oder das alte Objekt – halbe Änderungen sind unmöglich.</li>"
    "<li><b>Nur im Shop:</b> Alle Shop-/Rucksack-Aktionen laufen über <code>updateRun</code> in <code>game.ts</code>, das außerhalb der "
    "Phase <code>shop</code> nichts tut. Zusätzlich ist in der UI das <code>&lt;fieldset&gt;</code> deaktiviert.</li>"
    "<li><b>Reroll ist deterministisch:</b> Er benutzt den gespeicherten <code>seed</code> – gleicher Seed, gleiche Angebote.</li></ul>",
    code_box("src/run.ts", r"export function buyBlocker", note="Neu: „Backpack is full“")
    + code_box("src/run.ts", r"Selling gives back half", upto=r"export function sellItem", note="Verkaufen: Preis, Blocker, Aktion")
    + code_box("src/run.ts", r"Why the shop can't be rerolled", upto=r"export function rerollShop", note="Reroll: Blocker und Aktion")
    + code_box("src/game.ts", r"export function updateRun", note="Schutz: Aktionen nur in Phase „shop“")
    + code_box("src/pages/ShopPage.tsx", r"const act =", 1, note="Eine Hilfsfunktion für alle Shop-Aktionen"),
    tests("src/run.test.ts", "B1 shop economy"),
    [
        ("Wo wird verhindert, dass Gold negativ wird?",
         "In den Blockern: <code>buyBlocker</code> („Not enough gold“) und <code>rerollBlocker</code>. <code>buyItem</code>/<code>rerollShop</code> "
         "rufen den Blocker zuerst auf und geben bei einem Problem den alten Zustand zurück."),
        ("Warum <code>Math.floor</code> beim Verkaufen?",
         "Die Anforderung sagt „half their price (rounded down)“. Iron Cleaver kostet 5 → 2 Gold zurück."),
        ("Was passiert, wenn man während der Gegnersuche kauft?",
         "Nichts: <code>updateRun</code> ignoriert Aktionen außerhalb von <code>shop</code>, und die Buttons sind im deaktivierten fieldset."),
    ],
)

B2 = section(
    "b2", "B2 – Rucksack sortieren", "15 %", "feature/b2-backpack-arrangement", ["9b87920"],
    "Item auswählen (sichtbar markiert), auf einen anderen Platz verschieben; auf einem belegten Platz werden die beiden getauscht. "
    "Die Oberfläche zeigt, welche Züge möglich sind, und man kann abbrechen.",
    "<p>Die Rucksack-Felder waren nur Anzeige-Elemente (<code>&lt;li&gt;</code>), nicht klickbar. Ein gekauftes Item blieb für immer auf "
    "seinem Platz.</p>",
    files(
        ("src/run.ts", "<code>moveBlocker</code> und <code>moveItem</code> (verschieben/tauschen)"),
        ("src/components/Backpack.tsx", "Felder sind jetzt Buttons; Auswahl gold umrandet; mögliche Ziele gestrichelt mit „➡️ move“ bzw. "
                                         "„🔁 swap“; Cancel-Button"),
        ("src/pages/ShopPage.tsx", "Auswahl-Zustand <code>selected</code> (nur UI) und Esc-Taste zum Abbrechen"),
    ),
    "<ul><li><b>Tauschen in einer Zeile:</b> <code>[a[from], a[to]] = [a[to], a[from]]</code> deckt beide Fälle ab: Ist das Ziel leer "
    "(<code>null</code>), wird einfach verschoben; ist es belegt, wird getauscht. Kein Sonderfall nötig.</li>"
    "<li><b>Mögliche Züge anzeigen:</b> Die UI fragt für jedes Feld <code>moveBlocker(...) === null</code> – wieder dieselbe Regel wie "
    "in der Aktion (wie bei B1).</li>"
    "<li><b>Auswahl ist UI-Zustand:</b> Welches Feld ausgewählt ist, gehört nicht zum Spielstand (wird nicht gespeichert), deshalb "
    "<code>useState</code> in der Seite statt im <code>GameState</code>.</li>"
    "<li><b>Abbrechen auf drei Arten:</b> Cancel-Button, nochmal auf das ausgewählte Item klicken, oder Esc.</li></ul>",
    code_box("src/run.ts", r"Why the item in slot `from`", upto=r"export function moveItem", note="Regel: verschieben oder tauschen")
    + code_box("src/components/Backpack.tsx", r"A slot is a possible move target", upto=r"function handleSlotClick", note="Klick-Logik: auswählen / verschieben / abbrechen")
    + code_box("src/pages/ShopPage.tsx", r"// Escape cancels", 6, note="Esc bricht die Auswahl ab"),
    tests("src/run.test.ts", "B2 backpack arrangement"),
    [
        ("Was passiert beim Klick auf ein Feld, wenn schon ein Item ausgewählt ist?",
         "<code>handleSlotClick</code>: gleiches Feld → Auswahl aufheben; mögliches Ziel → <code>onMove</code> (verschieben/tauschen) und "
         "Auswahl aufheben; sonst ein anderes Item auswählen."),
        ("Warum ist ein leeres Feld manchmal klickbar und manchmal nicht?",
         "<code>disabled={!item &amp;&amp; !isTarget}</code>: Leere Felder sind nur klickbar, wenn gerade ein Item ausgewählt ist und dorthin "
         "verschoben werden kann."),
    ],
)

B3 = section(
    "b3", "B3 – Statuseffekte Gift &amp; Heilung", "15 %", "feature/b3-status-effects", ["4a2cef4"],
    "<b>Poison</b> gibt dem Gegner Stapel; ein vergifteter Kämpfer verliert regelmäßig HP pro Stapel, Gift stapelt sich und ignoriert "
    "Block. <b>Heal</b> heilt sich selbst, nie über die max. HP. Mindestens 3 Items pro Effekt, im Shop erhältlich, Gegner dürfen sie "
    "nutzen. Anzeige im Kampf, Kampflog, Regel-Panel und Tooltips; Werte deterministisch und erklärt.",
    "<p>Items konnten nur <code>damage</code> und <code>block</code>. Ereignisse im Kampflog hatten immer eine <code>itemId</code> "
    "(Statusschaden hat aber kein Item).</p>",
    files(
        ("src/types.ts", "<code>ItemEffects</code> + <code>poison</code>, <code>heal</code>; <code>FighterSnapshot</code> + <code>poison</code>; "
                         "neue Event-Arten; Events haben jetzt ein eigenes <code>icon</code>"),
        ("src/items.ts", "6 neue Items: Venom Vial, Viper Fang, Toxic Spores (Gift) · Healing Herb, Troll Blood, Blessed Shield (Heilung); Labels"),
        ("src/battle.ts", "<code>POISON_INTERVAL</code>, <code>POISON_DAMAGE_PER_STACK</code>, <code>applyStatusEffects</code>; "
                          "<code>resolveItem</code> kann Gift/Heilung"),
        ("src/components/BattleView.tsx", "Gift-Zähler pro Kämpfer, Farben im Kampflog"),
        ("src/rules.ts", "Tooltip-Texte und Abschnitt „🧪 Status effects“ – aus den Konstanten erzeugt"),
        ("server/opponents.js", "Gegner in Runde 3, 5 und 7 benutzen Gift-/Heil-Items"),
    ),
    "<ul><li><b>Werte:</b> Gift tickt alle <b>2 Ticks (1 s)</b>, <b>1 HP pro Stapel</b>, geht direkt auf die HP (ignoriert Block) und "
    "verschwindet nie. Heilung = <code>min(heal, maxHp − hp)</code>.</li>"
    "<li><b>Reihenfolge pro Tick:</b> zuerst Statuseffekte, dann feuern die Items (Spieler zuerst). Steht als Kommentar über "
    "<code>simulateBattle</code> und im Regel-Panel.</li>"
    "<li><b>Knockout-Fall:</b> Ein Kämpfer mit 0 HP darf sich im selben Tick nicht wieder hochheilen (<code>heal &amp;&amp; !isDown(self)</code>). "
    "Sonst hätte Heilung einen Knockout rückgängig machen können.</li>"
    "<li><b>Erklärungen aus Konstanten:</b> Die Texte in <code>rules.ts</code> setzen die Zahlen aus <code>battle.ts</code> ein – ändert man "
    "einen Wert, stimmt die Erklärung automatisch.</li></ul>",
    code_box("src/battle.ts", r"/\*\* Poison hurts every", 4, note="Konstanten für Gift")
    + code_box("src/battle.ts", r"^function applyStatusEffects", note="Gift (und Burn aus B4) am Anfang jedes Ticks")
    + code_box("src/battle.ts", r"^function resolveItem", note="Ein Item feuert: Schaden, Block, Gift, Burn-Bonus, Heilung")
    + code_box("src/items.ts", r"// Poison items", 4, note="Die Gift-Items"),
    tests("src/battle.test.ts", "B3 poison") + tests("src/battle.test.ts", "B3 heal"),
    [
        ("Warum ignoriert Gift den Block, Schaden aber nicht?",
         "Schaden läuft über <code>hitThroughBlock</code> (Block zuerst). Gift zieht in <code>applyStatusEffects</code> direkt "
         "<code>self.hp -= damage</code> ab – so verlangt es die Anforderung."),
        ("Wann genau tickt Gift?",
         "Wenn <code>tick % POISON_INTERVAL === 0</code>, also bei Tick 2, 4, 6 … (jede Sekunde)."),
        ("Woher weiß das Kampflog, welches Symbol es zeigen soll?",
         "Jedes <code>BattleEvent</code> hat jetzt ein Feld <code>icon</code> (Item-Symbol oder ☠️/🔥 bei Statusschaden). Vorher wurde das Icon "
         "über die <code>itemId</code> gesucht – Statusschaden hat aber kein Item."),
    ],
)

B4 = section(
    "b4", "B4 – Item-Sets &amp; Burn", "20 %", "feature/b4-item-sets", ["2ac8ae3"],
    "Mindestens 2 Sets (eins davon <b>Fire</b>) mit je mindestens 3 Items. Bonus ab 2 Items, für Spieler und Gegner. Set-Badges im Shop "
    "und im Kampf, aktive Boni sichtbar. Fire bringt den neuen Status <b>Burn</b>: stapelt schneller und macht mehr Schaden als Gift, "
    "wird von Block abgefangen und klingt ab.",
    "<p>Es gab keine Sets. Kämpfer bestanden nur aus Name, HP und Items.</p>",
    files(
        ("src/sets.ts (neu)", "Set-Definitionen, Bonus-Werte (<code>FIRE_BURN_STACKS</code>, <code>GUARDIAN_START_BLOCK</code>), "
                              "<code>countSets</code>, <code>activeSets</code>"),
        ("src/items.ts", "Feld <code>set</code>; 3 neue Fire-Items (Fire Torch, Magma Hammer, Fire Bomb); Oak Buckler, Pot Lid, Spiked Shield → Guardian"),
        ("src/battle.ts", "<code>buildFighter</code> berechnet <code>sets</code>; Guardian-Startblock in <code>initState</code>; Burn in "
                          "<code>applyStatusEffects</code>; Fire-Bonus in <code>resolveItem</code>"),
        ("src/components/SetBadge.tsx (neu)", "Badge pro Item + Liste der Set-Boni mit Fortschritt (z. B. „🔥 Fire 1/2“)"),
        ("ItemCard, Backpack, BattleView", "Badges im Shop, Rucksack und Kampf; Burn-Zähler; aktive Boni pro Kämpfer"),
        ("server/opponents.js", "Ash Golem (Runde 6) benutzt das Fire-Set"),
    ),
    "<table class='files'><tr><th></th><th>☠️ Gift</th><th>🔥 Burn</th></tr>"
    "<tr><td>Wie oft</td><td>alle 2 Ticks (1 s)</td><td><b>jeden Tick</b> (0,5 s) → mehr Schaden</td></tr>"
    "<tr><td>Stapel pro Treffer</td><td>1–3</td><td><b>4</b> → stapelt schneller</td></tr>"
    "<tr><td>Block</td><td>wird ignoriert</td><td><b>fängt Burn zuerst ab</b></td></tr>"
    "<tr><td>Ende</td><td>nie</td><td><b>−1 Stapel pro Tick</b>, bis 0</td></tr></table>"
    "<ul><li><b>Burn kommt vom Set-Bonus, nicht vom Item:</b> „The Fire set adds Burn“ – also belohnt erst das Sammeln (2+ Fire-Items) mit Burn. "
    "Ein einzelnes Fire-Item macht nur normalen Schaden.</li>"
    "<li><b>Zweites Set Guardian</b> nutzt bestehende Schild-Items (erlaubt: „Sets may reuse existing items“): +6 Block zu Kampfbeginn.</li>"
    "<li><b>Gleich für Spieler und Gegner:</b> Beide Kämpfer werden mit <code>buildFighter</code> gebaut, und dort wird "
    "<code>activeSets(itemIds)</code> berechnet – es gibt keinen Sonderweg für den Spieler.</li>"
    "<li><b>Toxic Spores von 4 auf 3 Gift gesenkt</b>, damit Burn (4) wirklich schneller stapelt als jedes Gift-Item.</li></ul>",
    code_box("src/sets.ts", r"/\*\* A set bonus is active", 6, note="Alle Set-Werte an einem Ort")
    + code_box("src/sets.ts", r"export function countSets", note="Zählt Set-Items")
    + code_box("src/sets.ts", r"export function activeSets", note="Welche Boni sind aktiv (ab 2 Items)")
    + code_box("src/battle.ts", r"^export function buildFighter", note="Gilt für Spieler UND Gegner")
    + code_box("src/battle.ts", r"^function initState", note="Guardian: Startblock"),
    tests("src/battle.test.ts", "B4 sets"),
    [
        ("Wie unterscheidet sich Burn technisch von Gift?",
         "In <code>applyStatusEffects</code>: Gift macht <code>self.hp -= …</code> nur bei <code>tick % 2 === 0</code>. Burn ruft jeden Tick "
         "<code>hitThroughBlock</code> auf (Block zuerst) und senkt danach <code>self.burn</code> um <code>BURN_DECAY</code>."),
        ("Wo wird entschieden, ob ein Gegner einen Set-Bonus hat?",
         "<code>buildOpponentFighter</code> → <code>buildFighter</code> → <code>activeSets(opponent.items)</code>. Dasselbe wie beim Spieler."),
        ("Wie würdest du ein drittes Set hinzufügen?",
         "<code>SetId</code> in <code>types.ts</code> erweitern, Eintrag in <code>SETS</code> und Zähler in <code>countSets</code>, Items mit "
         "<code>set: …</code> markieren, Bonus in <code>battle.ts</code> umsetzen. Badges und Regeltext kommen automatisch aus <code>SETS</code>."),
    ],
)

B5 = section(
    "b5", "B5 – Zuverlässige Gegnersuche", "10 %", "feature/b5-matchmaking", ["dfce2d2", "66d553c"],
    "Während der Suche sieht man, dass gesucht wird, und kann keine zweite starten. Bei Fehler/nicht erreichbarer API zurück in einen "
    "benutzbaren Shop mit verständlicher Meldung und neuem Versuch. Ein Kampf startet nur für die aktuelle Runde und die aktuelle Suche; "
    "langsame, doppelte oder späte Antworten dürfen nie einen Kampf (neu) starten oder ein Ergebnis doppelt anwenden.",
    "<ul><li>Nach einem Fehler blieb die Phase <code>searching</code> → <b>Shop blieb gesperrt</b>.</li>"
    "<li>Der Button war während der Suche klickbar → zwei Suchen gleichzeitig möglich.</li>"
    "<li><code>startBattle</code> prüfte gar nichts – auch eine späte Antwort hätte einen Kampf gestartet.</li></ul>",
    files(
        ("src/types.ts", "<code>GameState.searchId</code>"),
        ("src/game.ts", "<code>fightBlocker</code> („Searching…“), <code>startSearch(game, searchId)</code>, <code>isCurrentSearch</code>, "
                        "<code>searchFailed</code> → zurück in den Shop, <code>startBattle</code> mit Prüfung von Such-ID und Runde"),
        ("src/pages/ShopPage.tsx", "<code>handleFindOpponent</code> erzeugt pro Suche eine ID (<code>crypto.randomUUID()</code>)"),
        ("src/api.ts", "Eine Hilfsfunktion <code>request</code>: Timeout (8 s), verständliche Meldungen, <code>ApiError</code>; Antwort wird geprüft"),
    ),
    "<ul><li><b>Such-ID statt nur Phase prüfen:</b> Nur „sind wir in <code>searching</code>?“ reicht nicht – eine alte Antwort kann "
    "ankommen, während schon eine <i>neue</i> Suche läuft. Mit der ID gehört jede Antwort eindeutig zu einer Suche.</li>"
    "<li><b>Warum nicht nur <code>AbortController</code>?</b> Abbrechen stoppt die Anfrage, schützt aber den Zustand nicht, falls doch "
    "eine Antwort durchkommt. Die ID-Prüfung funktioniert immer.</li>"
    "<li><b>Runde prüfen:</b> <code>opponent.round !== game.run.round</code> → Fehler statt Kampf.</li>"
    "<li><b>Ergebnis nur einmal:</b> <code>showFrame</code> wendet das Ergebnis genau beim Erreichen des letzten Frames an; danach ist "
    "<code>isReplayDone</code> wahr und weitere Aufrufe ändern nichts.</li></ul>",
    code_box("src/game.ts", r"export function fightBlocker", note="Zweite Suche ist gesperrt")
    + code_box("src/game.ts", r"Starts a search with a fresh id", upto=r"export function startBattle", note="Suche starten, Antwort prüfen, Fehler behandeln")
    + code_box("src/pages/ShopPage.tsx", r"async function handleFindOpponent", note="Ablauf in der Oberfläche")
    + code_box("src/api.ts", r"^async function request", note="Alle API-Aufrufe: Timeout + verständliche Fehler"),
    tests("src/game.test.ts", "B5 matchmaking"),
    [
        ("Erkläre den Ablauf, wenn man auf „Find opponent“ klickt.",
         "<code>handleFindOpponent</code> → neue <code>searchId</code> → <code>startSearch</code> (Phase <code>searching</code>, Button zeigt "
         "„Searching…“) → <code>fetchOpponent</code> → bei Erfolg <code>startBattle(current, opponent, searchId)</code>, bei Fehler "
         "<code>searchFailed(…, searchId)</code>. Die Phase wird <code>battle</code>, und <code>RequireRoute</code> leitet auf <code>/battle</code> um."),
        ("Was passiert mit einer Antwort, die erst nach einem neuen Run ankommt?",
         "Der neue Run hat <code>searchId: null</code> und Phase <code>shop</code> → <code>isCurrentSearch</code> ist falsch → die Antwort wird ignoriert."),
        ("Warum wird <code>update((current) => …)</code> statt <code>game</code> benutzt?",
         "Nach dem <code>await</code> ist die Variable <code>game</code> veraltet. <code>update</code> bekommt immer den aktuellen Zustand."),
    ],
)

B6 = section(
    "b6", "B6 – Speichern &amp; Fortsetzen", "10 %", "feature/b6-save-resume", ["3274175", "66d553c"],
    "Browser neu laden und den Run auf dem passenden Bildschirm fortsetzen. Kaputte, inkompatible oder unmögliche Spielstände dürfen das "
    "Spiel nicht kaputt machen. Eine eigene Regel für Refresh während Suche oder Kampf – Refresh darf kein Gratis-Reroll, kein anderer Gegner, "
    "kein zweites Ergebnis und kein Ausweichen vor einer Niederlage sein.",
    "<p>Der Zustand lebte nur in <code>useState</code> im <code>GameProvider</code> – nach einem Refresh war alles weg.</p>",
    files(
        ("src/save.ts (neu)", "<code>toSaveData</code>, <code>fromSaveData</code>, <code>isValidRun</code>, <code>loadGame</code>, "
                              "<code>saveGame</code>, Versionsnummer <code>SAVE_VERSION</code>"),
        ("src/state/GameProvider.tsx", "Startzustand aus <code>loadGame()</code>; <code>useEffect</code> speichert nach jeder Änderung"),
        ("src/pages/StartPage.tsx", "Button „Continue round X“"),
        ("src/rules.ts", "Abschnitt „💾 Saving“ erklärt die Refresh-Regeln"),
    ),
    "<ul><li><b>Was gespeichert wird:</b> run id, „submitted“, Phase und der ganze Run (Runde, Gold, Leben, Siege, Seed, Shop, Rucksack). "
    "Shop und Seed sind gespeichert → <b>kein Gratis-Reroll</b>. Der Gegner hängt nur von der Runde ab → <b>kein anderer Gegner</b>.</li>"
    "<li><b>Refresh während des Kampfes:</b> Der Kampf steht beim Start schon fest, das Replay ist nur Animation. Deshalb speichert "
    "<code>toSaveData</code> während eines Kampfes den Run <b>mit bereits eingetragenem Ergebnis</b> (<code>skipReplay(game).run</code>). "
    "Nach dem Refresh zählt das Ergebnis genau einmal, und es geht mit der nächsten Runde weiter (Meldung im Shop).</li>"
    "<li><b>Refresh während der Suche:</b> zurück in den Shop mit Meldung, nochmal suchen – gleicher Gegner.</li>"
    "<li><b>Validierung:</b> Typen und Bereiche, aber auch ob der Run <i>möglich</i> ist: Siege + verlorene Leben = gespielte Runden; "
    "Gold nie mehr als je ausgezahlt; Item-IDs eindeutig und bekannt. Alles andere → Spielstand löschen, Startseite.</li>"
    "<li><b>Versionsnummer:</b> Ändert sich das Speicherformat, wird <code>SAVE_VERSION</code> erhöht; alte Stände gelten als inkompatibel.</li>"
    "<li><b>Erste Version → Endversion:</b> Zuerst wurde der Gegner gespeichert und der Kampf beim Laden neu simuliert "
    f"({commit('3274175')}). Beim Aufräumen ({commit('66d553c')}) wurde das durch die einfachere Idee oben ersetzt: weniger Felder, "
    "weniger Prüfungen, gleiches Ergebnis.</li></ul>",
    code_box("src/save.ts", r"export function toSaveData", note="Während eines Kampfes: Stand NACH dem Kampf speichern")
    + code_box("src/save.ts", r"export function fromSaveData", note="Laden + Refresh-Regeln")
    + code_box("src/save.ts", r"export function isValidRun", note="Ist das ein möglicher Run?")
    + code_box("src/state/GameProvider.tsx", r"// Continue a saved run", 7, note="Laden beim Start, Speichern nach jeder Änderung"),
    tests("src/save.test.ts", "B6 save and resume"),
    [
        ("Warum kann man mit einem Refresh keiner Niederlage ausweichen?",
         "Während der Phase <code>battle</code> wird nie der Stand <i>vor</i> dem Kampf gespeichert, sondern <code>skipReplay(game).run</code> – "
         "also schon mit −1 Leben bzw. +1 Sieg."),
        ("Woran erkennt das Spiel einen „unmöglichen“ Run?",
         "<code>isValidRun</code>: z. B. 3 Siege in Runde 1 (Siege + verlorene Leben ≠ Runde − 1), 9999 Gold, doppelte Item-IDs, unbekannte Items."),
        ("Warum ein <code>try/catch</code> in <code>loadGame</code>?",
         "<code>JSON.parse</code> wirft bei kaputtem Text. Dann wird der Spielstand gelöscht und die Startseite gezeigt, statt abzustürzen."),
    ],
)

B7 = section(
    "b7", "B7 – Hall of Fame", "20 %", "feature/b7-hall-of-fame", ["cf66c5f", "66d553c"],
    "Am Ende des Runs Namen eingeben und sehen, wie der Run im Vergleich steht. Die lokale API speichert und listet die besten Runs "
    "(eigene Sortierung, angezeigt), prüft jeden Run und lehnt ungültige/unplausible Daten mit klarer Meldung ab. UI: Lade-, Leer- und "
    "Fehlerzustand, erneut senden ohne neu tippen, nie doppelt senden. Eigene Seite, Endpunkte in <code>docs/API.md</code>.",
    "<p>Der Server kannte nur <code>/api/health</code> und <code>/api/opponents</code>. Am Ende gab es nur „New run“.</p>",
    files(
        ("server/hallOfFame.js (neu)", "<code>validateRun</code> (Prüfung + Plausibilität), <code>compareEntries</code> (Sortierung), "
                                       "<code>createHallOfFame</code> (Speicher im RAM)"),
        ("server/index.js", "<code>GET</code>/<code>POST /api/hall-of-fame</code>; JSON-Fehler bei kaputtem Body"),
        ("src/types.ts, src/game.ts", "<code>runId</code> und <code>submitted</code> im <code>GameState</code>; <code>markSubmitted</code>; "
                                      "neue Route <code>/hall-of-fame</code>"),
        ("src/components/SubmitRun.tsx (neu)", "Namensformular mit „Sending…“, Fehler + „Retry“ (Name bleibt stehen)"),
        ("src/pages/HallOfFamePage.tsx (neu)", "Lade-, Fehler- (mit „Try again“), Leer- und Tabellenansicht"),
        ("src/pages/ResultPage.tsx, Layout.tsx", "Formular und – nach dem Absenden – direkt die Rangliste; Link im Header"),
        ("docs/API.md", "Beide Endpunkte dokumentiert"),
    ),
    "<ul><li><b>Sortierung:</b> zuerst Siege (victory), dann mehr Wins, dann weniger Runden, bei Gleichstand wer zuerst eingereicht hat.</li>"
    "<li><b>Plausibilität:</b> Ein Sieg braucht 5 Wins und mindestens 1 Leben; eine Niederlage 0 Leben und weniger als 5 Wins; "
    "Runden = Wins + verlorene Leben (jede Runde ist genau ein Kampf).</li>"
    "<li><b>Nie doppelt – auf beiden Seiten:</b> Jeder Run hat eine <code>runId</code>. Der Server lehnt dieselbe ID ein zweites Mal ab "
    "(<b>409</b>). Der Client speichert <code>submitted</code> im (gespeicherten) Spielstand und behandelt 409 als „schon erledigt“. "
    "Nur Client reicht nicht (Refresh, verlorene Antwort), nur Server würde dem Spieler einen Fehler zeigen.</li>"
    "<li><b>Retry ohne neu tippen:</b> Der Name liegt in <code>useState</code> der Komponente und bleibt bei einem Fehler erhalten.</li>"
    "<li><b>In-Memory:</b> laut Anforderung reicht das; nach Server-Neustart ist die Liste leer.</li></ul>",
    code_box("server/hallOfFame.js", r"^export function validateRun", note="Prüfung und Plausibilität")
    + code_box("server/hallOfFame.js", r"^export function compareEntries", note="Sortierung")
    + code_box("server/hallOfFame.js", r"Returns `\{ status, body \}`", upto=r"    submit\(body\)", note="Speichern, 409 bei doppelter runId")
    + code_box("server/index.js", r'app.get\("/api/hall-of-fame"', 6, note="Die beiden Endpunkte")
    + code_box("src/components/SubmitRun.tsx", r"async function handleSubmit", note="Absenden im Client"),
    tests("server/hallOfFame.test.js", "B7 hall of fame validation") + tests("server/hallOfFame.test.js", "B7 hall of fame storage"),
    [
        ("Was passiert, wenn man zweimal schnell auf Submit klickt?",
         "Beim ersten Klick wird <code>sending</code> wahr und der Button deaktiviert; <code>handleSubmit</code> bricht bei <code>sending</code> ab. "
         "Und selbst wenn zwei Anfragen ankämen: Der Server lehnt die zweite mit 409 ab."),
        ("Wie sieht man, wie der eigene Run abschneidet?",
         "Nach dem Absenden zeigt die Ergebnisseite direkt die Rangliste (<code>HallOfFamePage</code>); außerdem ist die Seite über den Header erreichbar."),
        ("Welche Statuscodes liefert POST /api/hall-of-fame?",
         "201 gespeichert, 400 ungültig/unplausibel/kaputtes JSON, 409 diese runId gibt es schon."),
    ],
)

QUALITY = """
<section id="quality">
  <h2>Qualitätsziele (nicht-funktional)</h2>
  <p>Ausführlich in <code>docs/QUALITY.md</code>. Kurz:</p>
  <table class="files">
    <tr><th>Ziel</th><th>Warum</th><th>Wie umgesetzt</th><th>Wie geprüft</th></tr>
    <tr><td><b>Korrekter, fairer Spielstand</b></td><td>Kein negatives Gold, keine verlorenen Items, kein doppeltes Ergebnis</td>
        <td>Pure Funktionen, Blocker pro Aktion, Such-ID</td><td>Unit-Tests</td></tr>
    <tr><td><b>Robustheit</b></td><td>API kann ausfallen, Refresh jederzeit, Daten können kaputt/gefälscht sein</td>
        <td>Timeout + Meldungen, Validierung von Spielstand und Einreichungen</td><td>Tests mit kaputten Daten, manuelle Checkliste</td></tr>
    <tr><td><b>Verständlichkeit</b></td><td>Jeder im Team muss den Code in der Prüfung erklären können</td>
        <td>Ein Modul pro Thema, benannte Konstanten, Regeltexte aus Konstanten, keine neuen Bibliotheken</td><td>Lint + Typecheck, ein Commit pro Feature</td></tr>
  </table>
</section>
"""

CLEANUP = f"""
<section id="cleanup">
  <h2>Finales Aufräumen {commit('66d553c')}</h2>
  <p>Am Ende wurden alle Anforderungen nochmal geprüft und Code, der komplizierter war als nötig, vereinfacht:</p>
  <table class="files">
    <tr><th>Vorher</th><th>Nachher</th><th>Warum</th></tr>
    <tr><td>Kampf beim Laden neu simulieren (Gegner + „resultApplied“ gespeichert)</td><td>Stand <i>nach</i> dem Kampf speichern</td><td>Weniger Felder und Prüfungen, gleiche Sicherheit</td></tr>
    <tr><td>3× fast gleicher fetch/try/catch-Code + Sonder-Fehlerklasse</td><td>Eine Hilfsfunktion <code>request()</code> + <code>ApiError</code> mit <code>status</code></td><td>Keine Wiederholung</td></tr>
    <tr><td>4 fast gleiche Handler im Shop</td><td>Eine Hilfsfunktion <code>act()</code></td><td>Kürzer, gleiche Regel überall</td></tr>
    <tr><td>Rangliste nur über Link</td><td>Rangliste direkt nach dem Eintragen</td><td>„see how it compares“ aus B7</td></tr>
    <tr><td>„Try again.“ an jede Meldung geklebt (teils doppelt)</td><td>Einmal in <code>searchFailed</code></td><td>Kein doppelter Text</td></tr>
  </table>
</section>
"""

OVERVIEW = f"""
<section id="overview">
  <h2>Überblick</h2>
  <p><b>Repository:</b> <a href="{REPO}" target="_blank">{REPO}</a> · Stand: Commit {commit(SHA)} · Team: Ihsan Atay, Sheikh Annas</p>
  <p>Alle sieben Anforderungen sind umgesetzt. Jede Anforderung wurde auf einem eigenen Branch gebaut und per Merge-Commit in
  <code>master</code> übernommen. Die Code-Ausschnitte in diesem Dokument werden direkt aus den Dateien gelesen; die Links öffnen genau
  diese Zeilen auf GitHub.</p>

  <h3>Architektur in einem Satz</h3>
  <p>Die <b>Spielregeln</b> sind reine TypeScript-Funktionen ohne React (<code>run.ts</code>, <code>battle.ts</code>, <code>game.ts</code>,
  <code>sets.ts</code>, <code>save.ts</code>): Sie bekommen einen Zustand und geben einen neuen zurück. Die <b>Oberfläche</b> (React) ruft
  sie nur über <code>update(...)</code> aus dem <code>GameProvider</code> auf.</p>
  <div class="flow">
    <div class="box">Klick in der UI<br><small>z. B. „Sell“</small></div><div class="arrow">→</div>
    <div class="box">Blocker prüfen<br><small><code>sellBlocker</code></small></div><div class="arrow">→</div>
    <div class="box">Regel (pure)<br><small><code>sellItem(run, slot)</code></small></div><div class="arrow">→</div>
    <div class="box">neuer Zustand<br><small><code>setGame</code></small></div><div class="arrow">→</div>
    <div class="box">speichern<br><small><code>saveGame</code> (B6)</small></div>
  </div>

  <h3>Phasen eines Runs</h3>
  <div class="flow">
    <div class="box">shop</div><div class="arrow">→</div><div class="box">searching<br><small>B5</small></div><div class="arrow">→</div>
    <div class="box">battle<br><small>Replay</small></div><div class="arrow">→</div><div class="box">shop … / finished<br><small>B7</small></div>
  </div>
  <p>Jede Phase hat ihre Seite (<code>routeForGame</code>); <code>RequireRoute</code> leitet automatisch auf die passende Seite um.</p>

  <h3>Übersicht</h3>
  <table class="files">
    <tr><th>Anf.</th><th>Gewicht</th><th>Haupt-Dateien</th><th>Commit</th><th>Tests</th></tr>
    <tr><td><a href="#b1">B1</a> Shop-Ökonomie</td><td>10 %</td><td><code>run.ts</code>, <code>Shop.tsx</code></td><td>{commit('d7171e4')}</td><td>6</td></tr>
    <tr><td><a href="#b2">B2</a> Rucksack</td><td>15 %</td><td><code>run.ts</code>, <code>Backpack.tsx</code></td><td>{commit('9b87920')}</td><td>3</td></tr>
    <tr><td><a href="#b3">B3</a> Gift &amp; Heilung</td><td>15 %</td><td><code>battle.ts</code>, <code>items.ts</code></td><td>{commit('4a2cef4')}</td><td>4</td></tr>
    <tr><td><a href="#b4">B4</a> Sets &amp; Burn</td><td>20 %</td><td><code>sets.ts</code>, <code>battle.ts</code></td><td>{commit('2ac8ae3')}</td><td>4</td></tr>
    <tr><td><a href="#b5">B5</a> Gegnersuche</td><td>10 %</td><td><code>game.ts</code>, <code>api.ts</code></td><td>{commit('dfce2d2')}</td><td>9</td></tr>
    <tr><td><a href="#b6">B6</a> Speichern</td><td>10 %</td><td><code>save.ts</code>, <code>GameProvider.tsx</code></td><td>{commit('3274175')}</td><td>4</td></tr>
    <tr><td><a href="#b7">B7</a> Hall of Fame</td><td>20 %</td><td><code>server/hallOfFame.js</code>, <code>SubmitRun.tsx</code></td><td>{commit('cf66c5f')}</td><td>12</td></tr>
  </table>
  <p>Prüfen: <code>npm test</code> (alle Tests), <code>npm run lint</code>, <code>npm run build</code>. Spiel starten: <code>npm run dev</code> → <code>http://localhost:5174</code>.</p>
</section>
"""

CSS = """
:root { --ink:#1b1611; --panel:#f7f3ec; --edge:#e2d8c6; --gold:#b9852a; --teal:#1f5c7a; --muted:#6b6257; }
* { box-sizing: border-box; }
body { margin:0; font: 15px/1.6 -apple-system, "Segoe UI", Roboto, Verdana, sans-serif; color: var(--ink); background:#fff; }
nav { position: fixed; top:0; left:0; bottom:0; width: 220px; padding: 20px 16px; background: var(--panel); border-right:1px solid var(--edge); overflow-y:auto; }
nav h1 { font-size: 17px; margin: 0 0 12px; color: var(--teal); }
nav a { display:block; padding: 4px 8px; border-radius: 6px; color: var(--ink); text-decoration:none; font-size: 14px; }
nav a:hover { background: var(--edge); }
main { margin-left: 220px; padding: 24px 40px 80px; max-width: 1020px; }
h1.title { color: var(--teal); font-weight: 600; margin: 0 0 4px; }
section { border-top: 2px solid var(--edge); padding-top: 12px; margin-top: 32px; }
h2 { color: var(--teal); margin: 8px 0; }
h3 { margin: 22px 0 6px; font-size: 16px; }
.weight { font-size: 13px; background: var(--gold); color:#fff; padding: 2px 8px; border-radius: 99px; vertical-align: middle; }
.meta { color: var(--muted); margin: 0; font-size: 14px; }
.req { background: #eef5f8; border-left: 4px solid var(--teal); padding: 10px 14px; border-radius: 4px; margin-top: 10px; }
code { font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background: #f1ede6; padding: 1px 4px; border-radius: 4px; }
table.files { border-collapse: collapse; width: 100%; font-size: 14px; }
table.files th, table.files td { border: 1px solid var(--edge); padding: 6px 8px; text-align: left; vertical-align: top; }
table.files th { background: var(--panel); }
figure.code { margin: 12px 0; border: 1px solid var(--edge); border-radius: 8px; overflow: hidden; }
figure.code figcaption { background: var(--panel); padding: 6px 10px; font-size: 13px; display:flex; justify-content: space-between; gap: 12px; }
figure.code figcaption a { color: var(--teal); }
figure.code .note { color: var(--muted); }
figure.code pre { margin:0; padding: 10px 12px; background:#1e1b17; color:#f1e4c8; overflow-x:auto; }
figure.code pre code { background: none; color: inherit; padding:0; font-size: 12.5px; }
.tests { background: #f2f8ef; border: 1px solid #cfe3c4; border-radius: 8px; padding: 8px 12px; font-size: 14px; }
.tests ul { margin: 4px 0 0; padding-left: 20px; }
details { border: 1px solid var(--edge); border-radius: 6px; padding: 6px 10px; margin: 6px 0; }
details summary { cursor: pointer; font-weight: 600; }
details p { margin: 6px 0 2px; }
.commit { font-family: ui-monospace, Menlo, monospace; font-size: 13px; color: var(--teal); }
.flow { display:flex; flex-wrap: wrap; align-items:center; gap: 6px; margin: 8px 0; }
.flow .box { border: 1px solid var(--teal); border-radius: 8px; padding: 6px 10px; text-align:center; background:#eef5f8; font-size: 14px; }
.flow .arrow { color: var(--teal); font-weight: bold; }
@media (max-width: 800px) { nav { display:none; } main { margin-left:0; padding: 16px; } }
@media print { nav { display:none; } main { margin:0; } details { break-inside: avoid; } details:not([open]) p { display:block; } }
"""

NAV = "".join(f'<a href="#{i}">{t}</a>' for i, t in [
    ("overview", "Überblick"), ("b1", "B1 Shop-Ökonomie"), ("b2", "B2 Rucksack"), ("b3", "B3 Gift &amp; Heilung"),
    ("b4", "B4 Sets &amp; Burn"), ("b5", "B5 Gegnersuche"), ("b6", "B6 Speichern"), ("b7", "B7 Hall of Fame"),
    ("quality", "Qualitätsziele"), ("cleanup", "Finales Aufräumen"),
])

page = f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backpack Brawl – Technische Dokumentation</title><style>{CSS}</style></head>
<body>
<nav><h1>🎒 Backpack Brawl</h1>{NAV}</nav>
<main>
<h1 class="title">Backpack Brawl – Technische Dokumentation</h1>
<p class="meta">Was wurde wo, wie und warum geändert – Anforderung für Anforderung (B1–B7).</p>
{OVERVIEW}{B1}{B2}{B3}{B4}{B5}{B6}{B7}{QUALITY}{CLEANUP}
</main></body></html>
"""

out = ROOT / "docs" / "TECHNICAL.html"
out.write_text(page)
print("wrote", out.relative_to(ROOT), "for commit", SHA)
