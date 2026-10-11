# French (fr) translation review

Independent review of all 1000 concepts in 4 blocks of 250.

## Counts
- Correct (left as is, no doubt): about 925
- Fixed: 15
- Left with doubt (no better single word, or two reasonable options): about 60, main ones listed below (14 groups)

## Changes
| id | English | old | new | reason |
|---|---|---|---|---|
| 58 | feel | ressentir | sentir | ressentir is literary; sentir is the common verb |
| 91 | remember | souvenir | retenir | 'souvenir' is a noun (verb is reflexive se souvenir); retenir is the closest single verb |
| 110 | agree | consentir | accepter | consentir is formal/rare |
| 181 | high | élevé | haut | élevé is abstract; haut is the basic adjective |
| 534 | journey | voyage | trajet | duplicate of 'trip' (voyage); trajet fits journey |
| 649 | language | langage | langue | langage = faculty/code, langue = a language |
| 707 | email | courriel | mail | courriel is Quebec usage; mail is common in France |
| 785 | shoot | abattre | tirer | abattre = shoot down/kill; tirer = shoot |
| 796 | fix | fixer | arranger | fixer = attach/stare; avoid false friend (repair is 824) |
| 842 | happen | survenir | arriver | survenir is formal; arriver/happen is common |
| 878 | until | jusque | jusqu'à | bare 'jusque' is incomplete |
| 889 | over | dessus | au-dessus | dessus alone is awkward as 'over (above)' |
| 897 | perhaps | probablement | peut-être | probablement means 'probably' |
| 915 | eighty | quatre-vingt | quatre-vingts | standard spelling |
| 921 | death | décès | mort | décès is administrative; mort is common |

## Remaining doubts
- 62 need = devoir (means must/owe; no single-word verb, "avoir besoin" is a phrase) - keep or "falloir"
- 77 stand = tenir (really "se tenir debout"/"être debout") - no clean single word
- 91 remember = retenir (true verb is reflexive "se souvenir"/"se rappeler")
- 116/331 weather = météo (fine; "temps" is also used)
- 216/217 away = ailleurs (more "elsewhere"; alternative "loin" is taken by far)
- 446/447 hungry/thirsty = affamé/assoiffé (stronger than hungry; natural is "avoir faim")
- 463 bathroom = salle-de-bain (non-standard hyphens; real form has spaces)
- 561 cheap = bon-marché (standard is "bon marché" with a space; alt "économique")
- 616 trust = confier (means entrust; real: "faire confiance"/"se fier")
- 620 care = soucier, 696 apologize = excuser, 701 argue = disputer, 702 complain = plaindre, 830 rest = reposer, 76 sit = asseoir (all reflexive in real use)
- 717 goodbye = salut (also hello; "au revoir" is a phrase), 718 please = svp (abbreviation; "s'il vous plaît" is a phrase)
- 782 kick = botter (informal), 809 hug = étreindre (literary; "serrer dans les bras")
- 888 through = par, 894 across = travers (real: "à travers"), 891 beside = auprès (real: "à côté")
- 904 both = tous (real: "tous les deux"), 907 something = chose (real: "quelque chose"), 931 everyone = tous (real: "tout le monde")

Note: build-words reports identical words for different concepts only as warnings (well below 60); `node tools/build-words.mjs --only=fr` prints "word tables built".
