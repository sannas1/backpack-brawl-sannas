"""Builds the development diary PDF in the layout of the AWE diary template.

Usage: python3 make_diary_pdf.py <output.pdf>
Edit TEAM / RESPONSIBLE / the TODO texts below and run again to regenerate.
"""
import sys

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# ---------------------------------------------------------------- data to fill in
TODO = '<font backColor="#fff3a0">[TODO: {}]</font>'
TEAM = "Ihsan Atay, Sheikh Annas"
RESPONSIBLE = {
    "B1 Shop economy, B2 Backpack arrangement": "Ihsan Atay",
    "B3 Poison &amp; heal, B4 Item sets &amp; burn": "Sheikh Annas",
    "B5 Matchmaking, B6 Save &amp; resume": "Ihsan Atay",
    "B7 Hall of fame (client + server)": "Sheikh Annas",
    "Tests, documentation, diary": "Both",
}
REPO = "https://github.com/sannas1/backpack-brawl-sannas"
COMMIT = REPO + "/commit/"

# ---------------------------------------------------------------- styling (like the template)
FONTS = "/System/Library/Fonts/Supplemental/"
pdfmetrics.registerFont(TTFont("Verdana", FONTS + "Verdana.ttf"))
pdfmetrics.registerFont(TTFont("Verdana-Bold", FONTS + "Verdana Bold.ttf"))
pdfmetrics.registerFont(TTFont("Verdana-Italic", FONTS + "Verdana Italic.ttf"))
pdfmetrics.registerFont(TTFont("Verdana-BoldItalic", FONTS + "Verdana Bold Italic.ttf"))
pdfmetrics.registerFontFamily("Verdana", normal="Verdana", bold="Verdana-Bold", italic="Verdana-Italic", boldItalic="Verdana-BoldItalic")

TEAL = HexColor("#1f5c7a")
GREY = HexColor("#999999")
LINK = HexColor("#1f5c7a")

title = ParagraphStyle("title", fontName="Verdana", fontSize=15, leading=20, textColor=TEAL, spaceAfter=6)
body = ParagraphStyle("body", fontName="Verdana", fontSize=9.5, leading=13.5, alignment=TA_LEFT, spaceAfter=4)
section = ParagraphStyle("section", parent=body, fontName="Verdana-Bold", fontSize=10.5, spaceBefore=12, spaceAfter=5)
sub = ParagraphStyle("sub", parent=body, fontName="Verdana-Bold", spaceBefore=6, spaceAfter=2)
small = ParagraphStyle("small", parent=body, fontSize=8.5, leading=11.5)


def link(url, text):
    return f'<link href="{url}" color="#1f5c7a"><u>{text}</u></link>'


def commit(sha):
    return link(COMMIT + sha, sha)


def bullets(items, style=body):
    return ListFlowable(
        [ListItem(Paragraph(text, style), leftIndent=14, value="•") for text in items],
        bulletType="bullet", start="•", leftIndent=14, bulletFontName="Verdana", bulletFontSize=9, spaceAfter=4,
    )


def table(rows, widths):
    t = Table([[Paragraph(cell, small) for cell in row] for row in rows], colWidths=widths)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, HexColor("#c8c8c8")),
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#e8f0f4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def header(canvas, doc):
    canvas.saveState()
    canvas.setFont("Verdana", 8.5)
    canvas.drawString(doc.leftMargin, A4[1] - 1.3 * cm, "AWE – Exam Diary")
    canvas.setFillColor(GREY)
    canvas.drawRightString(A4[0] - doc.rightMargin, 1.2 * cm, f"{doc.page}")
    canvas.restoreState()


# ---------------------------------------------------------------- content
story = [
    Paragraph("Practical Exam – Development Diary", title),
    Paragraph(f"Team members: {TEAM}", body),
    Paragraph(f"Repository: {link(REPO, REPO)}", body),

    # ---------------------------------------------------------------- overview
    Paragraph("Development Overview", section),
    Paragraph("<b>How did you organize your work?</b>", body),
    bullets([
        "We copied the starter into our own private repository and kept the original <i>init</i> commit as starting point.",
        "<b>One branch per requirement</b> (<i>feature/b1-…</i> to <i>feature/b7-…</i>), one clear commit per feature, merged into "
        "<i>master</i> with a merge commit, so every requirement can be found in the history.",
        "Order: B1, B2 (shop/backpack), then B3, B4 (battle), then B5, B6, B7 (network and saving). Before every merge "
        "<i>npm test</i>, <i>npm run lint</i> and <i>npm run build</i> had to pass.",
        "Quality goals (correct game state, robustness, understandability) are documented in <i>docs/QUALITY.md</i>.",
    ]),
    Paragraph("<b>Who was responsible for which parts?</b>", body),
    table([["Part", "Responsible"]] + [[part, who] for part, who in RESPONSIBLE.items()], [10 * cm, 6.5 * cm]),
    Spacer(1, 6),
    Paragraph("<b>Which requirements were not implemented?</b> None – B1 to B7 and the qualitative goals are implemented.", body),
    table([
        ["Requirement", "Commit", "Requirement", "Commit"],
        ["B1 Shop economy", commit("0479e7a"), "B5 Resilient matchmaking", commit("2170c19")],
        ["B2 Backpack arrangement", commit("8c943ca"), "B6 Save and resume", commit("acb7b1d")],
        ["B3 Status effects", commit("ac3280c"), "B7 Hall of fame", commit("ac6be58")],
        ["B4 Item sets + Burn", commit("7391804"), "Diary &amp; quality goals", commit("4b4899a")],
    ], [4.6 * cm, 3.6 * cm, 4.6 * cm, 3.7 * cm]),

    # ---------------------------------------------------------------- decisions
    Paragraph("Important Decisions", section),

    Paragraph("1. One “blocker” function per action – used by the UI and by the rule (B1, B2)", sub),
    Paragraph(
        "Every action has a function that returns <i>why</i> it is not possible (<i>buyBlocker</i>, <i>sellBlocker</i>, "
        "<i>rerollBlocker</i>, <i>moveBlocker</i>, <i>fightBlocker</i>). The button shows this text and is disabled, and the action "
        "itself calls the same function and returns the unchanged state. <b>Why:</b> the requirement says the interface must explain "
        "the problem before trying <i>and</i> the same rule must protect the action – one function means they can never disagree. "
        f"Along the way we found a starter bug: buying into a full backpack took the gold and the item vanished ({commit('0479e7a')}).", body),

    Paragraph("2. Burn comes from the Fire set bonus, not from an item effect (B4)", sub),
    Paragraph(
        "Fire items deal normal damage; with 2+ Fire items every Fire item that fires also adds 4 burn to the enemy. The second set, "
        "Guardian (existing shield items), gives 6 starting block. All set values live in <i>src/sets.ts</i> and are applied the same "
        "way to player and opponents. <b>Burn vs. poison:</b> poison hurts every 2 ticks, ignores block and never ends; burn hurts "
        "<b>every tick</b> (more damage), adds <b>4 stacks per hit</b> (stacks faster), <b>is absorbed by block</b> and "
        f"<b>decays by 1 per tick</b> ({commit('7391804')}).", body),

    Paragraph("3. Every opponent search has an id (B5)", sub),
    Paragraph(
        "<i>startSearch</i> stores a <i>searchId</i>; <i>startBattle</i> and <i>searchFailed</i> only act if this is still the running "
        "search and the opponent belongs to the current round. <b>Why:</b> in the starter a failed search left the shop locked and the "
        "button could be pressed again while searching. Checking only the phase is not enough, because an old answer can arrive while a "
        "new search runs. We did not use <i>AbortController</i> alone, because it cancels requests but does not protect the state "
        f"({commit('2170c19')}).", body),

    Paragraph("4. Save the run, re-simulate the battle (B6)", sub),
    Paragraph(
        "We save phase, run, the opponent during a battle and whether its result was already applied – but not the battle frames. "
        "The battle is deterministic, so it is simulated again on load. <b>Why:</b> less data to validate, and a faked result in "
        "localStorage can never be loaded. <b>Refresh policy:</b> during a search: back to the shop (same opponent, saved shop, so no "
        "free reroll); during a replay: jump to the end and apply the result exactly once (no escaping a loss). Saves are versioned and "
        "checked for a <i>possible</i> run (wins + lost lives = rounds played, gold not above all gold paid out, unique item ids); "
        f"anything else is discarded ({commit('acb7b1d')}).", body),

    Paragraph("5. “Never submit twice” on client and server (B7)", sub),
    Paragraph(
        "Each run has a <i>runId</i>. The server rejects the same id a second time (HTTP 409) and checks plausibility (e.g. a victory "
        "needs 5 wins and at least 1 life). The client saves <i>submitted</i> with the game and treats 409 as “already done”. "
        "<b>Why:</b> neither side alone is enough – the client can be refreshed or lose a response, and the server alone would show the "
        f"player an error ({commit('ac6be58')}).", body),

    Paragraph("Challenges", sub),
    bullets([
        "A fighter at 0 HP could heal back up later in the same tick – fixed: a knocked-out fighter cannot heal.",
        "Tick order with statuses: we chose “poison and burn first, then items” and explain it in the rules panel.",
        "Adding <i>runId</i> in B7 changed the save format – we raised the save version, so old saves are ignored (the “incompatible” case of B6).",
    ]),

    Paragraph("Verification", sub),
    bullets([
        "44 automated Vitest tests: shop/backpack invariants, poison/heal/burn/sets, every search race condition, broken and impossible saves, hall-of-fame validation, duplicates and ordering.",
        "Lint and TypeScript build pass; API checked by hand with curl (201 / 409 / 400); manual UI checklist in <i>docs/QUALITY.md</i>.",
    ]),

    # ---------------------------------------------------------------- AI
    Paragraph("AI Usage", section),
    bullets([
        "<b>Tool:</b> Claude Code (Anthropic, model Claude Opus 5.5) as a coding agent in the terminal.",
        "<b>How:</b> we gave it the starter repository and the requirements. It read the existing code, implemented the requirements one by "
        "one on separate branches, wrote the tests and drafted the documentation and this diary. Its commits are marked with "
        "<i>Co-Authored-By: Claude</i>.",
        "<b>Why:</b> AI tools were allowed in the implementation phase; it let us spend our time on understanding and checking the solution. "
        "We explicitly asked for a simple, understandable solution: no extra libraries, small functions, comments that explain <i>why</i>.",
        "<b>Our part:</b> we defined what the solution should look like (simple, understandable, no extra libraries, one branch per "
        "requirement). Each of us is responsible for understanding and explaining the parts in the table above.",
        "<b>Risk:</b> in the exam we have to explain the code without AI, so for every decision above we made sure we understand the reason, not only the code.",
    ]),

    # ---------------------------------------------------------------- reflection
    Paragraph("Final Reflection and Lessons learned", section),
    bullets([
        "<b>Pure functions pay off:</b> the game rules do not depend on React, so almost everything – even the timing cases of B5 – could be tested with simple unit tests.",
        "<b>Ask “what if it arrives late, twice or broken?”</b> B5, B6 and B7 were mostly about that, not about new features.",
        "<b>One place for numbers:</b> rule texts and tooltips are generated from the game constants, so the explanations never got out of date.",
        "<b>Next time:</b> review each feature branch together before merging, so both of us know every part – not only our own.",
    ]),
    Spacer(1, 4),
    HRFlowable(width="100%", thickness=1.2, color=HexColor("#a0a0a0"), spaceBefore=4, spaceAfter=0),
]

out = sys.argv[1] if len(sys.argv) > 1 else "DIARY.pdf"
doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=2.3 * cm, rightMargin=2.3 * cm, topMargin=2.2 * cm, bottomMargin=2 * cm,
                        title="Practical Exam – Development Diary", author="Backpack Brawl team")
doc.build(story, onFirstPage=header, onLaterPages=header)
print("wrote", out)
