TASK-20261030-03 | Assigned to: Jarvis (Hermes on Tyler's Mac) | Project: pembroke | Status: open | Model: MiniMax-M3 | Est. MiniMax cost: under $5
Title: Tax rate history page (2010–2025) with school and town budgets on pembroke.goodbotai.tech
Tyler approved (Oct 30, 2026) a tax rate history feature. CoS built and verified the dataset: tax years 2010–2025, from NH DRA rate tables, the Pembroke Annual Reports (which reproduce the DRA calculation), the CNHRPC master plan table that cites DRA, SAU 53 meeting minutes and packets, and the NH election databases. Tyler will pass you two files, pembroke-tax-history.json and partisan-bands.json, plus SOURCES.md and GAPS.md. Commit them under data/ (data/tax-history/). Do not re-derive or edit the numbers. Any value that is null stays null and is shown as "not available" with its note.
What to build:
1. A new page /taxes/history. It shows a stacked bar or area chart of the total rate per $1,000 by tax year, split into municipal, county, local education and state education. Each year's tooltip shows the four components, the total, and the source link. Mark the revaluation years (2019 and 2024) on the axis with a short note: "Revaluation year: assessed values rose, so the rate is not directly comparable to the year before."
2. A budget line or second chart of the voter-approved school operating budget (labeled by fiscal year and meeting date) and the town operating budget (calendar year), in dollars. Show nulls as gaps, not zero. Show the note for each derived or flagged value (FY2021, FY2023, FY2024, FY2025) on hover or in a footnote.
3. Optional partisan shading toggle, off by default. Background bands show the NH governor's party, the state senator and the NH House delegation mix for Pembroke's district, using blue for Democrat and red for Republican. Label it "Context only. State officials do not set Pembroke's town or school budgets." Show district changes from redistricting (Merrimack 7 to Merrimack 20 in 2012, Merrimack 12 in 2022). Never shade or assign a party to the Select Board, School Board or Budget Committee.
4. A prominent neutral note at the top of the page:
   - Pembroke's Select Board, School Board and Budget Committee are nonpartisan.
   - The school operating budget is set by voters at the annual School District Meeting, and the town budget by voters at Town Meeting.
   - The state education portion and state aid formulas are set by the state, and changes to them affect the school portion of the rate.
   - No causal claims anywhere. Do not write that any official or party raised or lowered taxes. No adjectives about officials.
5. A data-as-of stamp (2026-10-30), a "Sources" section that links every source in SOURCES.md, and a "Known gaps" section summarizing GAPS.md.
6. On the existing PropertyTrends component, add a one-line revaluation caveat next to the "up X% from 2024" text, and link to /taxes/history. Do not change the 2026_projected number in data/property-trends.json. Flag it in the PR description as unsourced so CoS can decide what to do with it.
7. Add /taxes/history to sitemap.ts. Also add a /taxes landing page or a redirect so /taxes no longer returns 404. A simple index linking to /taxes/history and /property-values is enough. Use the existing Unofficial banner.
Process:
- Run git pull --rebase first.
- Work on a branch (e.g. feat/tax-history) and open a PR. Do NOT merge to main. CoS (Grok Bot Chief of Staff) reviews and merges after Tyler's OK. Include screenshots (desktop and mobile) in the PR.
- Post status updates as NEW Hindsight entries tagged coord:task, project:pembroke, author:Hermes that reference TASK-20261030-03 (in progress / PR opened with link / blocked with reason).
- Do not edit this entry.
