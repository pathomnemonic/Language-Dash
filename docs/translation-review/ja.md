# Japanese (ja) translation review

Independent second review of all 1000 entries in data/words/ja.json (word choice, sense, script, romanization).

## Counts

- Correct as written: 964
- Fixed: 26
- Left, with doubt: 10

## Changes

| id | English | old | new | reason |
|---|---|---|---|---|
| 143 | home | 家 ie | うち uchi | "home": 家 duplicated "house" (家 ie); うち is the everyday word for home |
| 187 | few | 少し sukoshi | 少ない sukunai | 少し means "a little"; "few" is 少ない |
| 192 | easy | 易しい yasashii | 簡単 kantan | 易しい clashes with homophone 優しい (kind) and is less common; 簡単 is the beginner word |
| 320 | fire | 炎 honō | 火 hi | 炎 is "flame"; fire = 火 |
| 346 | rabbit | 兎 usagi | うさぎ usagi | 兎 is a non-jōyō kanji; usually written in kana |
| 354 | frog | 蛙 kaeru | カエル kaeru | 蛙 is rare kanji; kana is usual |
| 356 | butterfly | 蝶 chō | チョウ chō | 蝶 non-jōyō; usually kana |
| 358 | spider | 蜘蛛 kumo | クモ kumo | 蜘蛛 rare kanji; kana is usual |
| 397 | leg | 足 ashi | 脚 ashi | 足 duplicated "foot" (167); 脚 is the leg |
| 416 | beard | 髭 hige | ひげ hige | 髭 rare kanji; kana is usual |
| 567 | simple | 簡単 kantan | 単純 tanjun | 簡単 now used for "easy"; 単純 is the "simple" (uncomplicated) word |
| 598 | shy | 恥ずかしい hazukashii | 内気 uchiki | 恥ずかしい means embarrassed; shy = 内気 |
| 616 | trust | 信じる shinjiru | 信頼する shinraisuru | 信じる duplicated "believe" (73); trust = 信頼する |
| 662 | biology | 生物 seibutsu | 生物学 seibutsugaku | 生物 is "living thing"; the subject is 生物学 |
| 701 | argue | 議論する gironsuru | 言い争う iiarasou | 議論する is "discuss" (duplicated concept 684); argue = 言い争う |
| 728 | customer | 客 kyaku | お客さん okyakusan | 客 duplicated "guest" (390); customer = お客さん |
| 757 | disease | 疾患 shikkan | 病気 byōki | 疾患 is medical/bookish; everyday word for disease |
| 796 | fix | 固定する koteisuru | 直す naosu | 固定する means fix in place; sense is repair/correct |
| 833 | listen | 聞く kiku | 聴く kiku | 聞く duplicated "ask" (56); listen = 聴く |
| 836 | allow | 許す yurusu | 許可する kyokasuru | 許す means forgive; allow = 許可する |
| 956 | broom | 箒 hōki | ほうき hōki | 箒 rare kanji; kana is usual |
| 957 | candle | 蝋燭 rōsoku | ろうそく rōsoku | 蝋燭 rare kanji; kana is usual |
| 972 | goat | 山羊 yagi | ヤギ yagi | 山羊 usually written in katakana |
| 974 | fox | 狐 kitsune | キツネ kitsune | 狐 rare kanji; katakana is usual |
| 976 | shark | 鮫 same | サメ same | 鮫 rare kanji; katakana is usual |
| 980 | eagle | 鷲 washi | ワシ washi | 鷲 rare kanji; katakana is usual |
| 983 | ant | 蟻 ari | アリ ari | 蟻 rare kanji; katakana is usual |

## Entries still in doubt (left unchanged)

- #135/#136 母 / 父: humble forms for own parents; お母さん / お父さん may be friendlier.
- #420 米 (raw rice) vs zh 米饭 (cooked): consider ご飯.
- #447 喉が渇いた is a phrase (no single-word option); #446 空腹 is a noun.
- #463 お風呂 means bath; "bathroom" could also be 浴室.
- #202 準備 is a noun for "ready"; 用意できた would be a phrase.
- #746 負う ("owe") is weak; 借りがある is a phrase.
- #639/#640 気づく used for both realize and notice.
- #139 月 (getsu) and #316 月 (tsuki) are written identically.
- #702 愚痴る is colloquial; #572 馬鹿 is rude-ish; #150 街 could be 都市 for "city".
- #801 水をやる is a phrase.

## Notes

`node tools/build-words.mjs --only=ja` prints "word tables built". Remaining shared words between concepts are genuine polysemy (all under the 60 limit).
