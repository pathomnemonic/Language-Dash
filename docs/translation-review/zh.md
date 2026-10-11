# Chinese (zh) translation review

Independent second review of all 1000 entries in data/words/zh.json (word choice, sense, script, romanization).

## Counts

- Correct as written: 977
- Fixed: 12
- Left, with doubt: 11

## Changes

| id | English | old | new | reason |
|---|---|---|---|---|
| 141 | word | 词 cí | 单词 dāncí | 词 is a bound morpheme; the word for "word" is 单词 |
| 344 | duck | 鸭 yā | 鸭子 yāzi | 鸭 alone is not used as the noun; 鸭子 |
| 444 | cook | 煮 zhǔ | 做饭 zuòfàn | 煮 means boil; cook = 做饭 |
| 477 | dress | 裙子 qúnzi | 连衣裙 liányīqún | 裙子 is a skirt, not a dress |
| 554 | loud | 响亮 xiǎngliàng | 吵 chǎo | 响亮 means resounding; loud/noisy = 吵 |
| 559 | rich | 富 fù | 有钱 yǒuqián | 富 is bookish/bound; 有钱 is the common word |
| 627 | mind | 思想 sīxiǎng | 头脑 tóunǎo | 思想 means ideology/thought |
| 629 | thought | 想法 xiǎngfǎ | 思想 sīxiǎng | 想法 duplicated "idea" (170) |
| 739 | sale | 销售 xiāoshòu | 打折 dǎzhé | 销售 means selling; sale (discount) = 打折 |
| 853 | govern | 管理 guǎnlǐ | 统治 tǒngzhì | 管理 means manage; govern = 统治 |
| 876 | once | 曾经 céngjīng | 一次 yīcì | 曾经 means "once upon a time/ever"; "once" (one time) = 一次 |
| 982 | worm | 虫 chóng | 虫子 chóngzi | 虫 is the generic insect; worm = 虫子 |

## Entries still in doubt (left unchanged)

- #420 米饭 is cooked rice (ja 米 / ko 쌀 are raw).
- #618 愿 for "wish" is bookish (希望 would duplicate #106).
- #862 民族 means ethnic group; "nation" is 国家 but that duplicates #145.
- #586 单一 for "single" (单身 if unmarried).
- #467 钟 for clock (时钟 is the unambiguous form).
- #494 图片 for picture is photo-like (ko 그림 / ja 絵 are drawings).
- #370 表哥 is specifically an older maternal male cousin.
- #204 单独 for alone (一个人 more natural).
- #24 许多 (很多 more beginner).
- #875 结束 is verbal; noun "end" is 结尾.
- #789 放下 for drop is "put down".

## Notes

`node tools/build-words.mjs --only=zh` prints "word tables built". Remaining shared words between concepts are genuine polysemy (all under the 60 limit).
