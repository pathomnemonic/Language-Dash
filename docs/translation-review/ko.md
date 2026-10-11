# Korean (ko) translation review

Independent second review of all 1000 entries in data/words/ko.json (word choice, sense, script, romanization).

## Counts

- Correct as written: 977
- Fixed: 13
- Left, with doubt: 10

## Changes

| id | English | old | new | reason |
|---|---|---|---|---|
| 185 | young | 어린 eorin | 젊은 jeolmeun | 어린 means "little/underage child"; young (adult) = 젊은 |
| 504 | rope | 밧줄 bapjul | 밧줄 batjul | RR romanizes final ㅅ as t |
| 572 | stupid | 어리석은 eoriseogeun | 멍청한 meongcheonghan | 어리석은 is bookish; 멍청한 is the everyday word |
| 616 | trust | 신뢰하다 sinroehada | 신뢰하다 silloehada | Romanization: 신뢰 is pronounced [실뢰] so ㄴ+ㄹ becomes ll |
| 688 | order | 명령하다 myeonghyeonghada | 명령하다 myeongnyeonghada | Romanization wrong: ㅇ+ㄹ becomes ng+ny, not "hy" |
| 716 | hello | 안녕 annyeong | 안녕하세요 annyeonghaseyo | 안녕 is the casual form; standard "hello" |
| 717 | goodbye | 안녕히 annyeonghi | 안녕 annyeong | 안녕히 alone is an incomplete phrase; 안녕 works as casual goodbye (hello is now 안녕하세요) |
| 719 | sorry | 미안 mian | 미안해요 mianhaeyo | 미안 is a truncated stem; polite everyday "sorry" |
| 721 | welcome | 환영 hwanyeong | 환영합니다 hwanyeonghamnida | 환영 is a noun; "welcome!" is 환영합니다 |
| 727 | manager | 관리자 gwalija | 관리자 gwallija | Romanization: ㄴ+ㄹ is pronounced ll |
| 806 | bend | 구부리다 gubuurida | 구부리다 guburida | Romanization had an extra u (gubuurida) |
| 880 | while | 반면 banmyeon | 면서 myeonseo | 반면 means "whereas/on the other hand"; temporal "while" = -면서 |
| 933 | human | 사람 saram | 인간 ingan | 사람 duplicated "person"; human = 인간 |

## Entries still in doubt (left unchanged)

- #55/#52/#85 말하다 used for say, tell and speak (tell could be 알리다).
- #171 것 for "thing" (물건 is the object word).
- #196 진실한 for "true" is a stretch (사실의 / 참인).
- #463 화장실 is toilet/restroom; 욕실 is the bathroom.
- #586 단일 for "single" (독신 if the unmarried sense is meant); ja 独身, zh 单一 differ.
- #618 바라다 duplicates #106 hope.
- #718 제발 is a begging "please".
- #548 높은 for tall (키가 큰 is a phrase).
- #982 벌레 is bug; worm is 지렁이.
- #420 쌀 is raw rice (밥 = cooked).

## Notes

`node tools/build-words.mjs --only=ko` prints "word tables built". Remaining shared words between concepts are genuine polysemy (all under the 60 limit).
