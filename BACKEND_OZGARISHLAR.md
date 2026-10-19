# CodeKids — backend o'zgarishlari

> Sana: 2026-10-19. Bu fayl `CODEKIDS_TAHLIL.md` (2026-10-13) dan keyin backendda nima o'zgarganini yozadi.
> O'zgarishlar hali **commit qilinmagan** (git working tree). **Frontend hali yangilanmagan**, u eski protokolda.
> `backend/docs/API.md` ham eskirgan: socket bo'limida yangi maydonlar va eventlar yo'q. Shu fayl ustun turadi.

---

## 0. Qisqa xulosa

1. **Labirint 5 levelli bo'ldi.** Bitta labirint o'rniga 5 ta ketma-ket labirint. Finish yashirin: leveldagi hamma
   savolga to'g'ri javob berilgach ochiladi. Socket protokoli o'zgardi (2-bo'lim).
2. **Qahramon va mashina tanlash.** Labirintda `labyrinth:hero` (1–8), typing poygasida `room:car` (1–12).
3. **Hamma tugatsa o'yin o'zi yopiladi**, vaqt tugashini kutmaydi. Typingda 1,5 s, labirintda 2,5 s keyin.
   `labyrinth:finished` da endi `reason` keladi.
4. **Ingliz tili (`en`)** typing uchun qo'shildi. 20 ta inglizcha matn bazaga yuklangan.
5. **Xona kodi endi faqat raqam** (6 xonali, masalan `482915`).
6. **Labirint uchun kamida 5 ta savol** kerak (oldin 3 ta edi).

## 1. O'zgargan fayllar

| Fayl | Holat | Nima |
|---|---|---|
| `backend/src/utils/levels.js` | **yangi** | 5 level generatori: o'lchamlar, savollarni bo'lish, checkpoint joylash |
| `backend/scripts/seed-typing-en.mjs` | **yangi** | 20 ta inglizcha typing matnini bazaga qo'shadi |
| `backend/src/socket/labyrinth.js` | katta o'zgarish | levellar, yashirin finish, hero, avto-yakun, `reason` |
| `backend/src/socket/rooms.js` | o'zgardi | `room:car`, `car_id`, typing avto-yakuni |
| `backend/src/socket/control.js` | o'zgardi | ustoz yopsa `reason: 'closed'`; kick'dan keyin avto-yakun tekshiruvi |
| `backend/src/services/rooms.js` | o'zgardi | raqamli xona kodi; kamida 5 savol |
| `backend/src/schemas/rooms.js`, `schemas/typing.js` | o'zgardi | `language` ga `en` qo'shildi |

---

## 2. Labirint: 5 level

### 2.1 Mexanika

- Xona `seed`idan 5 ta labirint **deterministik** quriladi: bir xil seed va bir xil savollar soni berilsa,
  natija ham bir xil.
- Level o'lchamlari: **9, 13, 17, 21, 27**. Chalg'ituvchi tarmoqlar har levelda ko'payadi
  (`branch` 0,1 → 0,9). Savollar ko'p bo'lsa, labirint kattalashadi (maksimum 41).
- Savollar levellarga bo'linadi. Har levelda kamida 1 ta savol bo'ladi, keyingi levellarda ko'proq.
  Checkpointlar soni ko'pi bilan 60 ta, ortiqcha savollar zaxirada qoladi. Misollar:
  - 5 savol → 1/1/1/1/1
  - 10 savol → 1/2/2/2/3
  - 20 savol → 2/3/4/5/6
  - 60+ savol → 5/8/12/16/19
- Checkpointlar butun labirint bo'ylab tarqoq joylashadi. Oldin ularning yarmi asosiy yo'lda edi.
- **Finish yashirin.** Leveldagi hamma checkpointga to'g'ri javob berilmaguncha `exit: null` keladi.
  Bu vaqtda finish katagi oddiy yo'lak hisoblanadi.
- **Finishga yetganda** ikki holat bor:
  - level < 5 bo'lsa: keyingi levelga o'tadi, `(1,1)` dan boshlaydi, `cleared = []`.
  - level 5 bo'lsa: `finished`, `rank` va bonus beriladi (avvalgidek).
- **Noto'g'ri javob** avvalgidek ishlaydi: jon −1 (`kids` rejimida jon kamaymaydi), 5 s blok. O'yinchi joriy
  leveldagi oxirgi `cleared` checkpointga qaytariladi, `cleared` bo'sh bo'lsa startga.
- Ustoz yuborgan `labyrinth.size` / `settings.rows` endi **e'tiborga olinmaydi**. Schema uni hali qabul qiladi.
- O'yinchi holatiga (`game_players.state`) `level`, `hero`, `answered`, `right` qo'shildi. Qayta ulanganda
  ular tiklanadi.

### 2.2 Protokol o'zgarishlari

**`labyrinth:init`**

Oldin:
```
{ grid, size, start, exit, checkpoints, status, endsAt, serverNow, mode, you, players }
```

Endi:
```js
{
  // joriy level (o'yinchi uchun — o'z leveli; ustoz uchun — 1-level, exit ochiq)
  level, levels: 5, grid, size, start,
  exit,                        // {x,y} | null — o'yinchida savollar tugaguncha null
  checkpoints,                 // [{x,y}] — shu leveldagi
  questions: { total, left },  // shu leveldagi savollar
  allLevels,                   // null (o'yinchi) | Level[5] (faqat ustoz, hammasida exit bor)
  mode,                        // 'standard' | 'kids'
  info: { title, questions, levels: 5, minutes, lives },  // lives: kids rejimida null, aks holda 3
  status, endsAt, serverNow,
  you,       // o'yinchi uchun, ustozda null — pastga qarang
  players,   // labyrinth:update dagi bilan bir xil
}
```

`Level` = `{ level, levels, grid, size, start, exit, checkpoints, questions: { total, left } }`

`you` = `{ id, level, cleared, x, y, lives, score, finished, eliminated, rank, question, lockedUntil, hero_id }`.
Bunda `level` va `hero_id` yangi.

**`labyrinth:move` ack**

```
{ x, y, finished, question, next }
```
`next` yangi maydon. O'yinchi keyingi levelga o'tganda unda yangi `Level` keladi, boshqa paytda `null`.
Level almashganda `x, y` start nuqtasini (1,1) ko'rsatadi. Klient labirintni `next` bo'yicha qayta chizishi kerak.

**`labyrinth:answer` ack**

Oldingi maydonlarga qo'shimcha keladi:
- `level`
- `questions: { total, left }`
- `exit`: `{x,y} | null`. Leveldagi oxirgi savolga to'g'ri javob berilganda `exit` keladi va bayroq ochiladi.

**`labyrinth:update` → `players[]`**

Har o'yinchiga qo'shildi:
- `level`
- `hero_id`: `1..8 | null`
- `answered`: jami javoblar soni
- `right`: to'g'ri javoblar soni

**`labyrinth:finished`**

```
{ players, reason }
```
`reason` qiymatlari:
- `'time'`: vaqt tugadi
- `'all_done'`: hamma tugatdi
- `'closed'`: ustoz yopdi

**Yangi event: `labyrinth:hero`**

- Payload: `{ code, hero }`, bunda `hero` 1..8 oralig'idagi butun son.
- Ack: `{ hero }`.
- Faqat o'yinchi yubora oladi. Ustoz yuborsa `NOT_A_PARTICIPANT` qaytadi.
- Faqat `status === 'waiting'` paytida ishlaydi, aks holda `ROOM_NOT_WAITING` (409) qaytadi.
- Tanlov bazada saqlanadi va hammaga `labyrinth:update` orqali `hero_id` bo'lib boradi.

**Avto-yakun**

Chiqarilmagan hamma o'yinchi `finished` bo'lsa (5-level finishiga yetgan yoki joni tugagan), 2,5 s dan keyin
`labyrinth:finished` keladi, `reason: 'all_done'`. Kick qilingandan keyin ham shu tekshiriladi.

---

## 3. Typing poygasi (race)

- **Yangi event: `room:car`.**
  - Payload: `{ code, car }`, bunda `car` 1..12 oralig'idagi butun son.
  - Ack: `{ car }`.
  - Faqat kutish paytida ishlaydi (`ROOM_NOT_WAITING`), faqat o'yinchi yubora oladi (`NOT_A_PARTICIPANT`).
  - Tanlov **faqat server xotirasida** saqlanadi, server qayta ishga tushsa yo'qoladi.
  - Backend izohiga ko'ra rasmlar `frontend/public/cars/car-XX.webp` da bo'lishi kerak. Bu fayllar hali yo'q.
- `room:snapshot` → `players[]` ga `car_id` qo'shildi (`1..12 | null`).
- `room:finished` → `players[]` ga `id` va `car_id` qo'shildi.
- **Avto-yakun:** chiqarilmagan hamma o'yinchi tugatsa, oxirgisi tugatgandan 1,5 s keyin `room:finished` keladi
  (tekshiruv har 250 ms da ishlaydi).

## 4. Ingliz tili (`en`)

- `en` qiymatini endi quyidagilar qabul qiladi:
  - `POST /rooms` (`language`)
  - `POST /typing/sessions` (`language`)
  - guest typing sessiyasi (`language`)
- `seed-typing-en.mjs` 20 ta matn qo'shadi:
  - sarlavhalar `Uzun matn EN #1..20`, topic `umumiy`, level 1–4;
  - matnlar faqat ASCII belgilardan iborat;
  - skriptni qayta ishga tushirish xavfsiz.
  - **Skript allaqachon ishlatilgan:** bazada 20 ta nashr etilgan `en` typing matni bor (2026-10-19 da tekshirildi).
- **O'zgarmagan:** `GET /contents` filtridagi `language` hali faqat `uz | ru` qiymatini qabul qiladi
  (`schemas/contents.js`, `listQuerySchema`). `?language=en` yuborilsa validatsiya xatosi qaytadi.

## 5. Xona kodi

- Kod endi faqat raqamlardan iborat, 6 xonali. Validatsiya o'zgarmagan (`^[A-Z0-9]{4,8}$`), shuning uchun eski
  harfli kodlar ham o'tadi.
- Frontendda kod maydonida `placeholder="6 belgili kod"` turibdi. Planshetda raqam klaviaturasi chiqishi uchun
  `inputmode="numeric"` qo'shish kerak.

## 6. Kamida 5 ta savol

- Xona ochishda savol kam bo'lsa `TOO_FEW_QUESTIONS` (400) qaytadi.
- Mavjud xona yuklanayotganda savol kam bo'lsa `ROOM_MISCONFIGURED` (500) qaytadi.
- **Bazadagi holat (2026-10-19):** 4 ta nashr etilgan `questions` kontentidan 3 tasida 5 tadan kam savol bor.
  Labirint uchun hozir faqat **1 ta** kontent yaraydi.

---

## 7. Frontendda nima qilish kerak

Hozirgi frontend kodi bilan solishtirib chiqilgan ro'yxat:

**Labirint** (`frontend/src/games/labyrinth/game.js`, `renderer3d.js`, `renderer2d.js`)
- `exit: null` holati to'g'ri ishlaydi, chunki rendererlarda `if (maze.exit)` tekshiruvi bor.
- Move ack'da `next` kelsa, `renderer.load(next)` bilan yangi labirintni chizish va "Level N/5" ko'rsatish kerak.
- Answer ack'da `exit` kelsa, bayroqni ochish kerak. `questions.left` ni "qolgan savollar" sifatida ko'rsatish kerak.
- Kutish ekraniga qahramon tanlash qo'shiladi: `labyrinth:hero` yuboriladi, boshqalar `hero_id` bo'yicha chiziladi.
- Ustoz ekrani: `allLevels` bo'yicha levelni almashtirib ko'rish, `info` paneli, o'yinchilar `level`,
  `answered/right` bilan.
- Yakuniy ekranda `reason` ga qarab matn chiqariladi: vaqt tugadi / hamma tugatdi / ustoz yopdi.

**Typing**
- Kutish ekraniga mashina tanlash qo'shiladi: `room:car` yuboriladi, `car_id` bo'yicha chiziladi.
  `public/cars/` rasmlari kerak.
- Til tanlashga `en` qo'shiladi (`frontend/src/games/typing/lobby.js` dagi `#lang`).

**Umumiy**
- Xona kodi maydoniga `inputmode="numeric"` qo'shish kerak.

## 8. Backendda qolgan nozikliklar

- `listQuerySchema.language` ga `en` qo'shilmagan (4-bo'lim).
- `services/rooms.js` dagi `CODE_ALPHABET` ustidagi izoh eskirgan ("0, O, 1, I chiqarilgan").
- `labyrinth.size` hali qabul qilinadi, lekin ishlatilmaydi.
- `room:car` faqat xotirada saqlanadi, labirint `hero` esa bazada. Shu nomuvofiqlik bor.
- `scripts/path.js` va `scripts/autoplay.js` eski bitta labirintli protokol uchun yozilgan, yangi levellar bilan ishlamaydi.
- `backend/docs/API.md` dagi socket bo'limi yangilanmagan.

## 9. Nima tekshirildi

- O'zgargan fayllarning hammasidan `node --check` o'tdi.
- `buildLevels` deterministik ekani tekshirildi. Har xil seed'lar bilan har bir level yechimli chiqdi.
- Jonli socket o'yini (5 level, hero, car, avto-yakun) **sinab ko'rilmadi**.
