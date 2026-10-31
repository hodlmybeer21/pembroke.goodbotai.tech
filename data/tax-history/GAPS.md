# Gaps and caveats (as of 2026-10-30)

## Scope
- The data covers tax years 2010–2025, starting at 2010. Pre-2010 years were dropped, including a 2006 row whose columns were shuffled (a county rate of 13.36 is implausible). The 2000/FY2001 figures found via UNH are also out of scope.
- DRA sets each year's rate in the autumn, so the 2026 rate is not yet in this dataset. Everything below is through tax year 2025.

## Missing (null in the JSON)
- **2013 school budget (FY2014) and 2013 town budget.** The 2013 Annual Report is not online at pembroke-nh.com: doc 883 is a cover/summary, and the 2013 link serves the 2012 report. The UNH Scholars copy could not be reached. The 2013 report could be fetched from UNH Scholars, or the Town Clerk could supply it.
- **2020 town budget vote.** Only the warrant's recommended $8,573,871 was found. The adopted figure in the 2020 town meeting minutes was not verified.
- **2026 town budget vote.** Only the recommended $12,195,101 was found.

## Lower-confidence values (flagged in the JSON notes)
- **2013 rate split.** It comes from CNHRPC's table, which cites DRA, and no DRA sheet was checked. The town cover pie prints county 2.50, which does not sum to the 26.84 total. CNHRPC's 2.65 does sum.
- **FY2021 school budget ($27,250,105) and FY2023 ($29,273,613).** These come from the next year's SAU 53 packet ("approved current FY... budget"), not from the meeting minutes.
- **FY2024 school budget ($30,779,520).** This also comes from the FY2025 packet. The 2023 proposal was $29,752,151 and a Concord Monitor story said "$29 million", so the voted figure needs to be checked against the March 11, 2023 minutes.
- **FY2025 school budget ($30,793,987).** This value is derived: the FY2026 proposal of $33,429,347 minus the stated increase of $2,635,360. It is consistent with the press report of a roughly $3M cut from $33.8M in March 2024. The minutes were not found.
- **FY2026 school budget.** The FY2027 packet prints the voted FY2026 figure as $34,584,347. The 2025 minutes and the packet's own arithmetic both give $33,429,347, which is the figure used.
- **OCR-read votes.** Votes from the 2010 and 2014–2021 scanned reports were read by OCR. Where the minutes said "adopted/passed" with no amendment, the warrant figure was taken as the voted figure, which is limited verification.
- **2019 rate page.** The page heading reads "2018" but its figures are the 2019 rate.
- **2012 cover pie.** It prints local ed as 16.23, while the calculation page shows 16.29.
- **The 2026 tax rate projection.** A separate file on this site, `data/property-trends.json`, carries a 2026 rate of $24.13 with no source behind it. It is not shown to residents and is not used anywhere on this page.

## Comparability
- Revaluations took effect in 2019 (assessed value $663.7M to $761.9M) and in 2024 ($794.5M to $1.233B). A rate drop in those years does not mean the levy fell. The chart marks the revaluation years.
- The school budget (fiscal year July–June, voted in March) does not line up 1:1 with a tax year. The budget figures exclude separate warrant articles, and the school budget is not net of state aid or other revenue, so it is not the local ed levy.

## Partisan data
- The 2010–12 Merrimack 7 district boundaries (which towns besides Pembroke) were not verified.
- John Reagan's 2014, 2016 and 2018 SD17 elections were not individually re-checked. His 2012 and 2014 service is confirmed by the town report lists and his 2020 win by electionstats.
- Sylvia Larsen's party (D) was not fetched from a primary source because Ballotpedia could not be reached.
- The band start and end dates use the NH organization day (the first Wednesday of December after the election). Certification dates were not used.
- No party is assigned to the Select Board, School Board or Budget Committee. They are nonpartisan offices.
