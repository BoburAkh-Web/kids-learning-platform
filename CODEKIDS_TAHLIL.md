# CodeKids — to'liq texnik tahlil (MVP holati)

> **Yangilangan: 2026-10-19.** Birinchi tahlil 2026-10-13 da qilingan: o'shanda barcha backend va frontend
> fayllari qatorma-qator o'qilgan (~7 500 qator). Unga 2026-10-19 dagi o'zgarishlar qo'shildi:
> - `c7e6849` — backend'ga yangi funksiyalar (5 levelli labirint, qahramon/mashina tanlash, avto-yakun, `en` tili,
>   raqamli xona kodi);
> - `bf3d300` — **eski frontend butunlay o'chirildi** (va GitHub Pages deploy workflow'i).
>
> Bu fayl avvalgi `BACKEND_OZGARISHLAR.md` o'rnini ham bosadi. **`backend/docs/API.md` dagi socket bo'limi
> eskirgan**; amaldagi protokol shu faylning 5-bo'limida.
> Fayl havolalari `papka/fayl.js:qator` ko'rinishida. Nima tekshirilgani 11-bo'limda.

---

## 0. Qisqa xulosa

**CodeKids** — o'qituvchi sinf uchun **jonli o'yin xonasi** ochadigan, o'quvchilar 6 xonali raqamli kod bilan
kirib **Typing Race** (tez yozish poygasi) yoki **5 levelli Labirint** (savol-javobli labirint) o'ynaydigan ta'lim
platformasi. Ro'yxatdan o'tmagan mehmon ham typing mashq qila oladi.

**Hozirgi holat (2026-10-19):**
- **Backend** ishlaydi: Node 20 + Express 5 + Socket.io + PostgreSQL (Neon), Render'da (`codekids-api.onrender.com`).
- **Frontend yo'q.** Repoda `frontend/` papkasida faqat `node_modules` qolgan (u `.gitignore`da). Eski
  frontend (Vanilla JS + Vite + Three.js) git tarixida turibdi (6-bo'lim). Yangisi 7-bo'limdagi talablar asosida
  yozilishi kerak.
- **`netlify.toml` hozir buzuq:** u `frontend/` papkasida `npm run build` ishga tushiradi, lekin u yerda
  `package.json` yo'q, shuning uchun Netlify build xato beradi.
- Xavfsizlik asoslari yaxshi qilingan (token rotation, natijani server hisoblaydi, Zod validatsiya). Lekin
  **real maktab sharoitida** darhol chiqadigan 4 ta kritik muammo bor (8-bo'lim):
  1. Bir sinf bitta IP orqali chiqadi → rate-limit butun sinfni bloklaydi.
  2. Frontend va backend turli domenlarda bo'lsa → Safari/iPad'da sahifa yangilansa login uchadi.
  3. Typing poygasida g'olibni klient yuborgan raqam belgilaydi → oson aldash mumkin.
  4. Server typing aniqligini faqat yakuniy matndan hisoblaydi → xatolar ko'rinmaydi, analitika ma'nosiz.

---

## 1. Loyiha maqsadi va mahsulot mantig'i

**Kim uchun:** maktab/o'quv markazi o'qituvchilari va 7–14 yoshli bolalar (UI o'zbekcha, qisman ruscha).

**Rollar:**
| Rol | Nima qila oladi |
|---|---|
| `teacher` | Savollar to'plami yaratadi (CSV yoki tahrirlash), nashr qiladi, sinf yaratadi, o'quvchini email bilan qo'shadi, xona ochadi, o'yinni boshlaydi/yopadi, o'yinchini chiqaradi (kick), analitika ko'radi |
| `student` | Kod bilan xonaga kiradi, typing/labirint o'ynaydi, solo typing mashq qiladi |
| mehmon | Login'siz typing mashq (natija saqlanmaydi) |

**O'yinlar:**
1. **Typing Race** — server tasodifiy matn beradi (`uz` / `ru` / `en`). Solo yoki xonada poyga. WPM va aniqlik
   **serverda** hisoblanadi. Xonada har o'quvchi mashinachasi yo'lakda yuradi (jonli progress). Kutish paytida
   o'quvchi mashinasini tanlaydi (1–12). Hamma tugatsa, poyga 1,5 s dan keyin o'zi yopiladi.
2. **Labirint** — xona seed'idan **5 ta ketma-ket labirint** quriladi (o'lchamlar 9 → 27). Har levelda
   checkpoint'lar bor, ularda ustozning savollar to'plamidan savol chiqadi. **Finish yashirin:** leveldagi
   hamma savolga to'g'ri javob berilgandan keyingina ochiladi. Finishga yetsa keyingi levelga o'tadi; 5-level
   finishi = o'yin tugadi.
   - To'g'ri javob +10 ball. Noto'g'ri: 5 s qulf, joriy leveldagi oxirgi tozalangan checkpoint'ga qaytish
     (bo'lmasa startga), `standard` rejimda −1 jon (3 jon), `kids` rejimida jon yo'q.
   - 5-level finish bonusi: 1-o'rin +50, 2-+30, 3-+20, qolganlar +10.
   - Kutish paytida o'quvchi qahramonini tanlaydi (1–8).
   - Hamma tugatsa (yoki joni tugasa), o'yin 2,5 s dan keyin o'zi yopiladi.
   - Klient faqat yo'nalish yuboradi, harakatni server tekshiradi (server-authoritative).

---

## 2. Arxitektura

```
[Frontend — HOZIR YO'Q (rejada: Netlify, netlify.toml bor)]
        │  REST /api/v1 (Bearer access token, refresh = httpOnly cookie)
        │  Socket.io (auth: {token})
        ▼
[Render: Node/Express 5 + Socket.io]  ── xona holati XOTIRADA (Map) ──
        │
        ▼
[Neon PostgreSQL]  (schema.sql, migratsiya = bitta SQL fayl)
```

**Repo tuzilmasi (hozirgi):**
```
netlify.toml                 # base=frontend, publish=dist, VITE_BASE=/ — frontend yo'qligi sabab hozir ishlamaydi
package-lock.json            # bo'sh ("packages": {}), tasodifan qo'shilgan
CODEKIDS_TAHLIL.md           # shu fayl
backend/
  schema.sql                 # butun DB sxemasi (idempotent), oxirida ALTER'lar qo'shilgan
  docs/API.md                # REST qismi to'g'ri; socket qismi ESKIRGAN (5-bo'limga qarang)
  scripts/                   # migrate, seed-typing(-long, -en), dev skriptlar (autoplay, emit, solve, path...)
  src/server.js              # Express + Socket.io, graceful shutdown
  src/db.js                  # pg Pool + withTransaction
  src/errors.js, logger.js   # AppError, yagona xato formati, pino (maxfiy maydonlar redact)
  src/middleware/            # auth (JWT), security (helmet, cors, rate-limit), validate (zod)
  src/schemas/               # zod sxemalar
  src/routes/                # auth, contents, typing, guest, rooms, teacher
  src/services/              # tokens (JWT + refresh rotation), rooms (yaratish/qo'shilish)
  src/socket/                # index (auth, throttling), rooms (typing), labyrinth, control (close/kick), roomStore (Map)
  src/utils/levels.js        # 5 level generatori (Growing Tree labirint, savollarni bo'lish, checkpoint joylash)
  src/utils/mazeGenerator.js # mulberry32 PRNG, MOVES, exitCell; eski bitta-labirint generatori (faqat skriptlarda)
frontend/                    # faqat node_modules (gitignore'da) — kod o'chirilgan
```

---

## 3. Ma'lumotlar bazasi (`backend/schema.sql`)

| Jadval | Vazifasi |
|---|---|
| `users` | email (citext, unique), bcrypt hash, `role` (student/teacher), nickname |
| `teacher_profiles` | full_name, school, subjects[], experience_years, age_group |
| `contents` | `type` = `questions` \| `typing_text`, `data` JSONB, `is_published`, soft delete, `language` (keyin qo'shilgan) |
| `likes` | user×content unique |
| `typing_sessions` | server bergan matn (`target_text`), `expires_at`, `consumed_at` (bir martalik, anti-replay) |
| `typing_results` | wpm, accuracy, time_sec, `flagged` (wpm>150), room_id |
| `game_rooms` | code (endi 6 xonali raqam), game_type, status (waiting/active/finished), settings JSONB (seed, mode; `rows/cols` endi ishlatilmaydi), expires_at (2 soat) |
| `game_players` | room×user, score, correct, lives, pozitsiya, `state` JSONB, kicked, rank |
| `classes`, `class_students` | ustoz sinflari |
| `refresh_tokens` | faqat SHA-256 hash, `family_id` (reuse aniqlash) |

`game_players.state` ichida: `cleared`, `pendingQuestion`, `qPos`, `rank`, `lockedUntil` va yangi qo'shilgan
`level`, `hero`, `answered` (jami javoblar), `right` (to'g'ri javoblar). Qayta ulanganda hammasi tiklanadi.
Sxemaga yangi ustun qo'shilmagan — hammasi JSONB ichida.

Indekslar o'ylab qo'yilgan (trigram qidiruv, leaderboard partial index). Migratsiya tizimi yo'q — bitta
idempotent SQL fayl, yangi o'zgarishlar oxiriga `ALTER ... IF NOT EXISTS` bilan qo'shilgan.

**Bazadagi ma'lumot (2026-10-19 dagi tekshiruv bo'yicha, bu safar qayta tekshirilmadi):**
- 20 ta nashr etilgan `en` typing matni bor (`seed-typing-en.mjs` ishlatilgan).
- 4 ta nashr etilgan `questions` kontentidan 3 tasida 5 tadan kam savol bor → labirint uchun hozir faqat
  **1 ta** kontent yaraydi.

---

## 4. Backend — modullar mantig'i

### 4.1 Auth (`routes/auth.js`, `services/tokens.js`)
- Register/login → access JWT (HS256, 15 daq, `typ: access`, issuer) + refresh token (48 bayt random, DB'da hash).
- Refresh: **rotation** + **reuse detection** (eski token qayta kelsa butun oila bekor qilinadi) — to'g'ri qilingan.
- Login'da user topilmasa ham `DUMMY_HASH` bilan bcrypt — timing hujumdan himoya.
- Refresh cookie: `path=/api/v1/auth`, `COOKIE_SECURE=true` bo'lsa `SameSite=None`.
- Yo'q: email tasdiqlash, parolni tiklash, profilni tahrirlash, eski tokenlarni tozalash.

### 4.2 Kontent (`routes/contents.js`)
- Ochiq lenta `GET /contents` (filtr, ILIKE qidiruv), `GET /contents/search` (pg_trgm), `GET /contents/mine` (ustoz).
- Ustoz: yaratish, CSV bulk-upload (multer, 2 MB, ≤100 savol, qatorma-qator xato hisobot), tahrirlash, soft delete, publish, like.
- Yo'q: unpublish, `language` maydonini yaratishda berish, moderatsiya.
- `GET /contents?language=` faqat `uz | ru` qabul qiladi (`schemas/contents.js:71`); `en` yuborilsa validatsiya xatosi.

### 4.3 Typing (`routes/typing.js`, `routes/guest.js`)
- `POST /typing/sessions` → server matnni tanlaydi (berilmasa tasodifiy, til bo'yicha), sessiya yaratadi.
  `language`: `uz | ru | en`.
- `POST /typing/results` → `FOR UPDATE` bilan bir martalik, <2 s bo'lsa `TOO_FAST`, server `computeMetrics`:
  pozitsiya bo'yicha to'g'ri belgilar, WPM = to'g'ri/5/daqiqa, accuracy = to'g'ri/yozilgan.
- Mehmon (`/guest/session`, `/guest/results`): matn va boshlanish vaqti imzolangan JWT ichida (alohida kalit),
  ishlatilgan `jti` lar xotiradagi `Map`da. `language`: `uz | ru | en`.

### 4.4 Xonalar (`services/rooms.js`, `routes/rooms.js`)
- Kod: **6 xonali raqam** (`0123456789` alfavitidan, masalan `482915`), 5 marta urinish. Validatsiya
  (`^[A-Z0-9]{4,8}$`) o'zgarmagan, shuning uchun eski harfli kodlar ham o'tadi.
- `POST /rooms`: `language` endi `uz | ru | en`. Typing'da `content_id` berilmasa, shu tildagi tasodifiy matn olinadi.
- Labirint: seed serverda yaratiladi, **kamida 5 savol** kerak (`TOO_FEW_QUESTIONS`, 400). Ustoz yuborgan
  `labyrinth.size` hali qabul qilinadi, lekin **e'tiborga olinmaydi** — o'lcham leveldan keladi.
- Join: `FOR UPDATE` bilan max_players tekshiruvi, qayta kirish (rejoin) qo'llab-quvvatlanadi, kicked bloklanadi.
- Host: `/rooms/mine`, `/rooms/:code/close`, `/rooms/:code/players/:id/kick`.

### 4.5 Socket (`socket/*`)
- Auth: token yoki mehmon `deviceId` (mehmon uchun handler yo'q — amalda ishlatilmaydi).
- Har socket'ga 15 event/s throttling; har event `wrapHandler` → `{ok, ...}` ack yoki `{ok:false, error}`.
- **Typing xona** (`socket/rooms.js`): `room:car`, `room:join`, `room:start` (host), `room:progress` (klient
  `correct` sonini yuboradi). 250 ms tick: o'zgargan xonalarga `room:snapshot`; vaqt tugasa **yoki hamma tugatsa**
  `room:finished` + DB'ga rank. Mashina tanlovi faqat xotirada.
- **Labirint** (`socket/labyrinth.js` + `utils/levels.js`): xona DB'dan yuklanadi, 5 level seed'dan qayta quriladi;
  savol tartibi va variantlar har o'yinchiga deterministik aralashtiriladi; o'yinchi holati (`state` JSONB)
  har harakatda DB'ga yoziladi → server qayta ishga tushsa ham davom ettirish mumkin. Vaqt taymeri va
  "hamma tugatdi" taymeri `setTimeout` bilan.
- `control.js`: REST'dan socket'ga ko'prik (close → `reason: 'closed'`, kick → `kicked` event, kanaldan
  chiqarish, labirintda kick'dan keyin avto-yakun tekshiruvi).

### 4.6 Ustoz (`routes/teacher.js`)
- Sinflar CRUD, o'quvchini **email** orqali qo'shish, dashboard sonlari.
- Analitika: faqat **typing_results** asosida (o'rtacha WPM/accuracy, "zaif mavzular" = past accuracy).
  Labirint natijalari analitikaga kirmaydi (o'yinchida `answered/right` sonlari bor, lekin savol bo'yicha emas
  va analitika endpoint'ida ishlatilmaydi).

---

## 5. Socket protokoli (amaldagi — `API.md` o'rniga shu bo'lim ustun)

Ulanish: `io(URL, { auth: { token } })`. Har event ack bilan javob beradi: `{ ok: true, ... }` yoki
`{ ok: false, error: { code, message } }`. Xato `app:error` eventi orqali ham keladi.

### 5.1 Typing xona (`room:*`)

| Event | So'rov | Ack | Izoh |
|---|---|---|---|
| `room:join` | `{ code }` | `{ joined: true, you }` | keyin `room:snapshot` keladi |
| `room:car` | `{ code, car }` (1..12) | `{ car }` | faqat o'yinchi (`NOT_A_PARTICIPANT`), faqat kutishda (`ROOM_NOT_WAITING`, 409). **Faqat xotirada**, server restart'da yo'qoladi |
| `room:start` | `{ code }` | `{ status: "active" }` | faqat host |
| `room:progress` | `{ code, correct }` | `{ correct, finished }` | har ~250 ms |

- **`room:snapshot`**: `{ code, status, startedAt, endsAt, targetLength, players: [{ id, nickname, correct, finished, car_id }] }`
  (`car_id`: `1..12 | null`).
- **`room:finished`**: `{ players: [{ id, nickname, correct, finished, rank, kicked, car_id }] }`. `reason` maydoni
  **yo'q** (faqat xona xotirada bo'lmagan holatda ustoz yopsa `reason: 'closed'` keladi).
- **Avto-yakun:** chiqarilmagan hamma o'yinchi tugatsa, oxirgisi tugatgandan 1,5 s keyin `room:finished`
  (tekshiruv har 250 ms).
- Backend izohiga ko'ra mashina rasmlari `frontend/public/cars/car-XX.webp` (01..12) bo'lishi kerak.

### 5.2 Labirint (`labyrinth:*`)

| Event | So'rov | Ack |
|---|---|---|
| `labyrinth:join` | `{ code }` | `{ joined, playerId }` + `labyrinth:init` |
| `labyrinth:hero` | `{ code, hero }` (1..8) | `{ hero }` |
| `labyrinth:start` | `{ code }` (faqat host) | `{ status, endsAt }` |
| `labyrinth:move` | `{ code, direction: up\|down\|left\|right }` | `{ x, y, finished, question, next }` |
| `labyrinth:answer` | `{ code, choice }` (variant indeksi) | `{ correct, correctIndex, lives, score, finished, eliminated, x, y, lockedUntil, level, questions, exit }` |

**`labyrinth:init`:**
```js
{
  // joriy level (o'yinchi uchun — o'z leveli; ustoz uchun — 1-level, exit ochiq)
  level, levels: 5, grid, size, start,
  exit,                        // {x,y} | null — o'yinchida leveldagi savollar tugaguncha null
  checkpoints,                 // [{x,y}] — shu leveldagi
  questions: { total, left },  // shu leveldagi savollar
  allLevels,                   // null (o'yinchi) | Level[5] (faqat ustoz, hammasida exit bor)
  mode,                        // 'standard' | 'kids'
  info: { title, questions, levels: 5, minutes, lives },  // lives: kids'da null, aks holda 3
  status, endsAt, serverNow,
  you,       // o'yinchi uchun, ustozda null
  players,   // labyrinth:update dagi bilan bir xil
}
```
- `Level` = `{ level, levels, grid, size, start, exit, checkpoints, questions: { total, left } }`.
- `grid[y][x]`: `"1"` devor, `"0"` yo'l (satrlar matn).
- `you` = `{ id, level, cleared, x, y, lives, score, finished, eliminated, rank, question, lockedUntil, hero_id }`.
  `question` = `{ index, text, options }` (javob yo'q, variantlar aralashtirilgan).

**`labyrinth:move` ack:** `next` — o'yinchi keyingi levelga o'tganda yangi `Level`, boshqa paytda `null`. Level
almashganda `x, y` start (1,1) ni ko'rsatadi; klient labirintni `next` bo'yicha qayta chizishi kerak.
Finish katagi yashirin paytda oddiy yo'lak (hech narsa bo'lmaydi).

**`labyrinth:answer` ack:** `level`, `questions: { total, left }` va `exit` (`{x,y} | null`). Leveldagi oxirgi
savolga to'g'ri javob berilganda `exit` keladi — bayroq ochiladi.

**`labyrinth:update`:** `{ status, endsAt, serverNow, players: [{ id, nickname, x, y, lives, score, finished, eliminated, rank, kicked, level, hero_id, answered, right }] }`.
Har harakat/javob/hero tanlovidan keyin, ack'dan keyin keladi.

**`labyrinth:finished`:** `{ players, reason }`, `reason`: `'time'` (vaqt tugadi), `'all_done'` (hamma tugatdi),
`'closed'` (ustoz yopdi).

**`labyrinth:hero`:** faqat o'yinchi (ustoz yuborsa `NOT_A_PARTICIPANT`), faqat `waiting` paytida
(`ROOM_NOT_WAITING`, 409). Tanlov bazada saqlanadi va hammaga `hero_id` bo'lib boradi.

**Qoidalar:**
- Harakat: 200 ms cooldown (`TOO_FAST`), devor (`BLOCKED`), savol javobsiz (`QUESTION_PENDING`), qulf (`LOCKED`),
  tugagan (`PLAYER_FINISHED`), xona tugagan (`ROOM_NOT_ACTIVE` / `ROOM_FINISHED`).
- Jon 0 bo'lsa: `eliminated: true`, `finished: true`.
- **Avto-yakun:** chiqarilmagan hamma o'yinchi `finished` bo'lsa (5-level finishi yoki joni tugagan), 2,5 s keyin
  `labyrinth:finished` (`reason: 'all_done'`). Kick'dan keyin ham tekshiriladi.
- Mavjud xona yuklanayotganda savol 5 tadan kam bo'lsa `ROOM_MISCONFIGURED` (500).

**5 level generatori** (`utils/levels.js`):
- O'lchamlar 9, 13, 17, 21, 27; chalg'ituvchi tarmoqlar har levelda ko'payadi (`branch` 0,1 → 0,9). Savollar
  ko'p bo'lsa labirint kattalashadi (maksimum 41).
- Savollar levellarga bo'linadi: har levelda kamida 1 ta, keyingilarida ko'proq; checkpoint ko'pi bilan 60 ta,
  ortiqcha savollar zaxirada. Misollar: 5 → 1/1/1/1/1, 10 → 1/2/2/2/3, 20 → 2/3/4/5/6, 60+ → 5/8/12/16/19.
- Checkpoint'lar butun labirint bo'ylab tarqoq (start, finish va bir-biridan uzoqroq tanlanadi).

**Socket xato kodlari:** `GUEST_NOT_ALLOWED`, `NOT_A_PARTICIPANT`, `FORBIDDEN`, `KICKED`, `ROOM_NOT_ACTIVE`,
`ROOM_NOT_STARTABLE`, `ROOM_NOT_WAITING`, `ROOM_FINISHED`, `NO_PLAYERS`, `BLOCKED`, `TOO_FAST`, `LOCKED`,
`QUESTION_PENDING`, `NO_PENDING_QUESTION`, `INVALID_CHOICE`, `PLAYER_FINISHED`, `WRONG_GAME_TYPE`,
`PROGRESS_DECREASED`, `PROGRESS_OUT_OF_RANGE`, `VALIDATION_ERROR`, `RATE_LIMITED`, `AUTH_REQUIRED`,
`TOKEN_EXPIRED`, `TOKEN_INVALID`.

---

## 6. Eski frontend (o'chirilgan, `bf3d300`)

Kod git tarixida: `git show bf3d300^:frontend/src/main.js` (yoki `git checkout bf3d300^ -- frontend` bilan
vaqtincha tiklash). U **eski protokolda** yozilgan edi (bitta labirint, hero/car/`next`/`reason` yo'q).

**Nima bor edi:** Vanilla JS + Vite 5 + Three.js 0.169, hash-router (`#/`, `#/typing`, `#/guest`, `#/room/CODE`,
`#/teacher`, `#/host/CODE?game=`), access token faqat xotirada + 401 → single-flight refresh, typing
(`sessionStorage`da davom ettirish, har 250 ms progress), labirint (klaviatura/D-pad/swipe, optimistik harakat,
3D InstancedMesh yoki 2D fallback, past quvvat rejimi), ustoz paneli (dashboard, sinflar + analitika, CSV yuklash
va savollarni tahrirlash, xona yaratish), PWA (manifest + service worker), kun/tun tema, reduced-motion.

**Undagi xatolar — yangi frontendda takrorlamaslik kerak:**
- Typing'da noto'g'ri belgi darhol o'chirilardi → server aniqlikni doim ~100% hisoblardi (8-bo'lim, 4-band).
- Typing host ekranida "Chiqarish" (kick) tugmasi chiqmasdi (`kickable` parametri qo'llanmagan).
- Typing'da o'z yo'lagi ajratilmasdi (`meId` o'rnatilmagan).
- Xonaga kirganda typing tili doim `uz` yuborilardi (backend `publicRoom` `language` qaytarmaydi).
- Ekrandagi WPM birinchi tugmadan, server WPM'i sessiya yaratilganidan hisoblanardi → farq.
- Xona yaratishda savollar to'plami barcha ustozlarning ochiq lentasidan (birinchi 50 ta) olinardi —
  "mening to'plamlarim" (`/contents/mine`) ishlatilishi kerak.
- Tugagan xonalar ro'yxati hisoblanib, ko'rsatilmasdi.
- Labirint host'dan chiqqanda `lab-host` CSS klassi `#app`da qolib, ustoz panelini buzardi.
- Ustoz UI'da typing matni yaratib bo'lmasdi.
- i18n deyarli ishlamasdi: til almashtirgich yo'q, ko'p matnlar kodga yozilgan, `ru` qisman.
- API'da bor, UI'da yo'q edi: like, qidiruv.
- GitHub Pages uchun `base: '/codekids/'` default edi — Netlify'da `VITE_BASE=/` kerak (`netlify.toml`da bor).

---

## 7. Yangi frontend uchun talablar (amaldagi backend protokoli bo'yicha)

**Labirint**
- `exit: null` holatini qo'llash: finish bayrog'i savollar tugaguncha ko'rinmasin.
- Move ack'da `next` kelsa — yangi labirintni chizish va "Level N/5" ko'rsatish.
- Answer ack'da `exit` kelsa — bayroqni ochish; `questions.left` ni "qolgan savollar" sifatida ko'rsatish.
- Kutish ekranida qahramon tanlash (`labyrinth:hero`, 1..8); boshqalarni `hero_id` bo'yicha chizish.
- Ustoz ekrani: `allLevels` bo'yicha levelni almashtirib ko'rish, `info` paneli, o'yinchilar ro'yxatida `level`
  va `answered/right`.
- Yakuniy ekranda `reason` bo'yicha matn: vaqt tugadi / hamma tugatdi / ustoz yopdi.

**Typing**
- Kutish ekranida mashina tanlash (`room:car`, 1..12), `car_id` bo'yicha chizish; `public/cars/car-01..12.webp`
  rasmlari kerak.
- Til tanlashda `en` ham bo'lsin.
- Xatolarni o'chirib tashlamaslik (yoki xatolar sonini alohida yuborish) — aks holda aniqlik ma'nosiz.

**Umumiy**
- Xona kodi maydoni: 6 xonali raqam, `inputmode="numeric"` (planshetda raqam klaviaturasi).
- Netlify uchun `netlify.toml` tayyor: `frontend/package.json`, `npm run build` → `frontend/dist`, `VITE_BASE=/`,
  `VITE_BACKEND_URL`. Backend `CORS_ORIGIN` ga Netlify domenini qo'shish va `COOKIE_SECURE=true` kerak.

---

## 8. Kamchiliklar (backend va infratuzilma, ustuvorlik bo'yicha)

### 🔴 Kritik — real sinfda darhol chiqadi

1. **Rate-limit IP bo'yicha, maktabda hamma bitta IP'da.**
   `backend/src/middleware/security.js:51-67` — umumiy limit 15 daqiqada 300 so'rov/IP, login/register — 10 ta
   muvaffaqiyatsiz urinish/IP. 25–30 bola bitta Wi-Fi/NAT orqali chiqadi: bir necha bola parolni xato tersa —
   butun sinf 15 daqiqaga login qila olmaydi; o'yin davomidagi REST so'rovlar ham 300 limitni tez to'ldiradi.
   *Yechim:* autentifikatsiyalangan so'rovlarni `user.id` bo'yicha cheklash, authLimiter'ni `email+IP` kalit bilan,
   limitlarni oshirish.

2. **Frontend va backend turli saytlarda → refresh cookie "third-party".**
   `backend/src/services/tokens.js:171-177`. Access token faqat xotirada saqlansa, reload'da sessiya faqat cookie
   orqali tiklanadi. Safari/iOS (iPad'lar!) va inkognito rejimi third-party cookie'ni bloklaydi → **har reload'da
   qayta login**. Yana: `COOKIE_SECURE=true` o'rnatilmasa `SameSite=Lax` bo'lib, cross-site'da umuman ishlamaydi.
   Render bepul tarifida birinchi so'rov 30–60 s "uyg'onadi".
   *Yechim:* bitta domen ostiga olish (masalan `codekids.uz` + `api.codekids.uz`) yoki frontend'ni backend bilan
   bir origin'dan berish.

3. **Typing poygasida natijani klient belgilaydi — aldash juda oson.**
   `backend/src/socket/rooms.js:214-245` — `room:progress {correct}` faqat "kamaymasin" va "matndan oshmasin"
   deb tekshiriladi. Brauzer konsolida bitta `emit('room:progress', {code, correct: 9999...})` bilan 1-o'rin.
   Yakuniy rank (`rankPlayers`, `rooms.js:309`) aynan shu raqamga va `finishedAt`ga asoslanadi; serverda
   hisoblangan `typing_results` rank'ga ta'sir qilmaydi. Endi bu raqam avto-yakunni ham ishga tushiradi.
   *Yechim:* progressni vaqtga nisbatan cheklash (masalan, ≤ 15 belgi/s), yoki yakuniy reytingni server
   hisoblagan `typing_results` (WPM) bo'yicha tuzish.

4. **Server typing xatolarini ko'rmaydi → aniqlik va analitika ishonchsiz.**
   `backend/src/routes/typing.js:15-31` — aniqlik faqat yakuniy matndan hisoblanadi. Klient xato belgini
   o'chirsa (eski frontend shunday qilardi), yakuniy matn doim to'g'ri prefiks → aniqlik ~100%. Natijada ustozning
   "zaif mavzular" va o'rtacha aniqlik ko'rsatkichlari (`routes/teacher.js:144-186`) ma'nosiz.
   *Yechim:* klient xatolar sonini (yoki keystroke log'ini) yuborsin, server uni tekshirib hisoblasin.

### 🟠 Yuqori

5. **Har kim o'zini "ustoz" qilib ro'yxatdan o'ta oladi va kontent hammaga ochiq.**
   `backend/src/schemas/auth.js:10` — role'ni foydalanuvchi o'zi tanlaydi. Nashr qilingan kontent
   (`routes/contents.js:57-77`) barcha ustozlarga ochiq lentada, moderatsiya yo'q. Bolalar platformasi uchun xavfli.
   *Yechim:* ustozni tasdiqlash (invite kod / admin), kontentni default "faqat o'zimniki" qilish.

6. **Bolalar uchun email majburiy + email orqali foydalanuvchini aniqlash mumkin.**
   7–9 yoshli bolada email bo'lmasligi mumkin. `routes/teacher.js:80-110` — istalgan "ustoz" istalgan email'ni
   kiritib, u ro'yxatdan o'tganmi va rolini bilib oladi (enumeration); o'quvchining roziligisiz sinfga qo'shiladi.
   *Yechim:* o'quvchilar uchun "sinf kodi + nickname + PIN" login, sinfga taklif/tasdiqlash.

7. **Xona/sessiya hayot sikli yopilmagan.**
   - Muddati o'tgan (2 soat) xonalarni hech kim `finished` qilmaydi — DB'da abadiy `waiting/active`.
   - Hech qachon boshlanmagan xonalar xotiradagi `Map`dan o'chmaydi (`socket/roomStore.js`) — sekin memory leak.
   - `refresh_tokens`, `typing_sessions` jadvallari tozalanmaydi.
   - Holat bitta process xotirasida (`roomStore`, mehmon `usedTokens` — `routes/guest.js:23`, `room:car`
     tanlovi) → faqat 1 instance, restart'da mehmon tokenlari qayta ishlatilishi mumkin.
   *Yechim:* davriy cleanup job (cron/`setInterval`), keyinchalik Redis.

8. **Labirintda har qadam = 1 ta DB UPDATE.** `backend/src/socket/labyrinth.js:553` (`savePlayer` har move'da).
   30 o'quvchi × ~5 qadam/s ≈ 150 yozuv/s Neon bepul tarifiga. *Yechim:* xotirada saqlab, 1–2 s da bir marta
   yoki faqat muhim hodisalarda (savol, level, finish) yozish.

9. **O'quvchi o'z natijalarini ko'ra olmaydi; labirint analitikasi yo'q.**
   O'quvchi tarixi / eng yaxshi WPM / reyting (leaderboard) endpoint'i yo'q (indeks bor, endpoint yo'q).
   Labirintda endi o'yinchi bo'yicha `answered/right` sonlari bor, lekin har savolga javob alohida saqlanmaydi →
   qaysi savol/mavzu qiyinligini bilib bo'lmaydi; ustoz analitikasi labirintni umuman ko'rmaydi.
   *Yechim:* `question_attempts` jadvali, `GET /me/results`, leaderboard endpoint.

10. **Frontend yo'q va deploy buzuq.** `netlify.toml` mavjud bo'lmagan `frontend/` ni build qiladi; GitHub Pages
    workflow o'chirilgan. Hozir foydalanuvchi uchun ishlaydigan sayt yo'q (eski `umarxon7887.github.io/codekids/`
    boshqa hisobdagi, eski protokolda).

### 🟡 O'rta

11. **Labirint avto-yakuni faqat socket orqali ulangan o'yinchilarni sanaydi.** `socket/labyrinth.js:375-378` —
    `allDone` xotiradagi `room.players` ni tekshiradi, u yerga o'yinchi faqat socket'dan `labyrinth:join` qilganda
    tushadi. REST orqali qo'shilib hali ulanmagan (yoki server restart'dan keyin qayta ulanmagan) o'quvchilar
    hisobga olinmaydi → ular hali o'ynamay turib o'yin `all_done` bilan yopilishi mumkin.
12. **Typing va labirint yakuni bir xil emas:** `room:finished` da `reason` yo'q (`socket/rooms.js:317-322`),
    labirintda bor. `room:car` faqat xotirada, labirint `hero` esa bazada.
13. **Typing matni `language`siz yaratiladi** — `schemas/contents.js:36-53` da `language` yo'q → API orqali
    yaratilgan matn `NULL` til bilan tasodifiy tanlovga (`services/rooms.js:41-44`, `routes/typing.js:40-48`)
    hech qachon tushmaydi. Typing matnlari faqat seed skriptlardan keladi. Lenta filtri `en` ni qabul qilmaydi
    (`schemas/contents.js:71`).
14. **`publicRoom` xona tilini qaytarmaydi** (`services/rooms.js:21-36`) → klient xonadagi typing sessiyasiga
    to'g'ri `language` yubora olmaydi.
15. **WPM vaqt bazasi:** server sessiya yaratilgan paytdan hisoblaydi (`routes/typing.js:147`) — sessiyani
    birinchi tugma bosilganda emas, oldinroq ochsa, WPM past chiqadi.
16. **Chiqarilgan (kicked) o'yinchilar `max_players`ga hisoblanadi** (`services/rooms.js:154-158`).
17. **Tick ketma-ket va xatoga chidamsiz** — bitta xonani yopishda DB xatosi bo'lsa, u har 250 ms qayta urinadi va
    boshqa xonalarni kechiktiradi (`socket/rooms.js:280-296`).
18. **Kids rejimida server restart'dan keyin o'rinlar qayta 1 dan boshlanadi** — `labyrinth.js:165-167`
    `lives > 0` sharti `lives = NULL` (kids) bo'lganda ishlamaydi.
19. **Mehmon tokeni ichida butun matn** — `schemas/typing.js:21` token ≤4000 belgi; 1400+ belgili ruscha matn
    bo'lsa natija yuborib bo'lmaydi (hozirgi seed matnlar qisqa, shuning uchun hozircha yashirin xato).

### ⚪ Past (tozalik, qo'llab-quvvatlash)

20. **Eskirgan hujjat va izohlar:** `backend/docs/API.md` socket bo'limi; `services/rooms.js:5` ("0, O, 1, I
    chiqarilgan" — alfavit endi raqam); `server.js:51-54, 62`; `contents.js:79` va `routes/rooms.js:34` dagi
    joyidan adashgan izohlar; `schemas/rooms.js:30` dagi hech qachon ishlamaydigan typing xabari.
21. **O'lik kod/keraksiz fayllar:** `labyrinth.size` (`schemas/rooms.js:3-10, 21`) qabul qilinadi, lekin
    ishlatilmaydi; `mazeGenerator.js` dagi `generateMaze`/`isCheckpoint` faqat eski skriptlarda; `scripts/path.js`,
    `solve.js`, `autoplay.js` eski bitta-labirint protokolida — yangi levellar bilan ishlamaydi;
    `backend/savollar.csv`, `backend/xato.csv`; root'dagi bo'sh `package-lock.json`.
22. **Test, CI, hujjat:** backend uchun avtomatik test yo'q, CI yo'q; `.env.example` yo'q (kerakli o'zgaruvchilar:
    `DATABASE_URL`, `JWT_ACCESS_SECRET` ≥32, `CORS_ORIGIN`, `COOKIE_SECURE`, `PORT`, `LOG_LEVEL`, `RATE_LIMIT_*`,
    `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`); root README yo'q; backend deploy konfiguratsiyasi
    (render.yaml/Dockerfile) yo'q.
23. API'da yo'q: unpublish, parol tiklash, profilni tahrirlash.
24. `scripts/seed-typing-long.mjs:6` — `DATABASE_URL` yo'q bo'lsa xato o'rniga URL chiqaradi.
25. Xona kodi endi faqat raqam (~1 mln variant) — login qilgan foydalanuvchi kodlarni terib ko'rib, begona kutish
    xonasiga kirishi nazariy jihatdan osonlashdi (xavf past, lekin rate-limit buni cheklashi kerak).

### ✅ Tuzatilganlar (2026-10-13 dan beri)

- **Hamma tugatsa ham o'yin tugamasdi** — endi typing 1,5 s, labirint 2,5 s dan keyin o'zi yopiladi (`c7e6849`).
- **Eski labirint prototipi va `codekids-frontend/.vite` qoldig'i** o'chirildi (`bf3d300`, butun frontend bilan birga).

---

## 9. Yaxshi qilingan jihatlar (saqlab qolish kerak)

- **Server-authoritative dizayn:** labirint harakati, savol javobi, level o'tishi, typing WPM/aniqlik — serverda.
- **Auth sifati:** refresh rotation + reuse detection, DB'da faqat hash, timing-safe login.
- **Validatsiya:** hamma joyda Zod, parametrlangan SQL (SQL injection yo'q), yagona xato formati.
- **Concurrency:** `FOR UPDATE` (join, refresh, natija), bir martalik sessiyalar.
- **Qayta ulanish:** labirint holati (level, hero, javoblar soni ham) DB'da — reload/uzilishdan keyin davom etadi.
- **Deterministik 5 level** (seed) — klientga faqat grid ketadi, javoblar ketmaydi; variantlar o'yinchiga xos
  aralashtiriladi; generator (`utils/levels.js`) sof funksiya — test qilish oson.
- **Hujjat:** `backend/docs/API.md` REST qismi aniq va to'liq.

---

## 10. MVP uchun tavsiya etilgan ish rejasi (tartib bilan)

0. **Yangi frontend** 7-bo'limdagi protokol bo'yicha (`frontend/` ichida, `netlify.toml` ga mos) + Netlify domenini
   backend `CORS_ORIGIN` ga qo'shish; `API.md` socket bo'limini yangilash.
1. **Domen va cookie:** frontend + backend bitta sayt ostida (custom domen) → Safari/iPad muammosi yo'qoladi.
2. **Rate-limit:** user.id bo'yicha, auth uchun email+IP; limitlarni sinf hajmiga moslash.
3. **Typing adolati:** progressni tezlik bo'yicha cheklash; yakuniy reytingni server natijasidan olish;
   xatolar sonini hisoblash (accuracy).
4. **Ustoz va bola xavfsizligi:** ustozni tasdiqlash; o'quvchi uchun email'siz login (sinf kodi + PIN);
   kontentni default xususiy qilish.
5. **Hayot sikli:** muddati o'tgan xonalarni yopish, xotirani tozalash, eski token/sessiyalarni o'chirish;
   labirint avto-yakunini DB'dagi o'yinchilar soni bilan solishtirish.
6. **Analitika:** `question_attempts` jadvali (labirint), o'quvchi tarixi va leaderboard endpoint'lari.
7. **Kontent:** kamida 5 savolli to'plamlar (hozir faqat 1 ta yaraydi), typing matniga `language`, `publicRoom` ga til.
8. **Tozalash:** eski skriptlar va o'lik kod, `.env.example`, README, `computeMetrics`/`levels.js`/token uchun
   unit testlar, backend CI.
9. **Masshtab (keyinroq):** labirint saqlashni batch qilish, Redis roomStore (fayl shunga tayyorlangan).

---

## 11. Nima tekshirildi

- **2026-10-13:** barcha backend va frontend fayllari o'qildi. Build/test ishga tushirilmadi.
- **2026-10-19:**
  - `c7e6849` va `bf3d300` diff'lari o'qildi; 8-bo'limdagi qator raqamlari hozirgi kodga moslab yangilandi.
  - O'zgargan backend fayllarining hammasidan `node --check` o'tdi.
  - `buildLevels`: 5 xil savollar soni (5, 10, 20, 60, 100) × 200 ta seed — har safar natija deterministik,
    har levelda finish va barcha checkpoint'lar start'dan yetib boriladigan (0 xato).
  - **Sinab ko'rilmadi:** jonli socket o'yini (5 level, hero, car, avto-yakun), REST endpoint'lar, bazadagi
    ma'lumot (3-bo'limdagi sonlar oldingi tekshiruvdan).

---

## 12. Boshqa AI yordamchi uchun kontekst (shu faylni yuklagan Claude uchun)

Sen CodeKids loyihasida yordam beryapsan. Muhim faktlar:
- Monorepo: `backend/` (Node 20, ESM, Express 5, Socket.io 4, pg, zod, pino). `frontend/` hozir bo'sh — eski
  Vanilla JS + Vite + Three.js frontend o'chirilgan, yangisi yozilishi kerak (6–7-bo'limlar).
- API prefiksi `/api/v1`, xato formati `{ error: { code, message, details? } }`, socket ack `{ ok, ... }`.
- **Amaldagi socket protokoli — 5-bo'limda**; `backend/docs/API.md` dagi socket qismi eskirgan.
- Xona holati process xotirasida (`backend/src/socket/roomStore.js`), DB — Neon PostgreSQL, sxema `backend/schema.sql`.
- Lokal backend (`backend/.env`) backend dasturchisining **haqiqiy umumiy Neon bazasiga** ulanadi: migratsiya yoki
  seed skriptlarni kelishmasdan ishga tushirma. Lokal `CORS_ORIGIN` faqat `http://localhost:5173` va `:5180`.
- Backendni alohida dasturchi yozadi, frontend tomoni — foydalanuvchida; backend protokoli o'zgarib turadi,
  shuning uchun socket bilan ishlashdan oldin kodni (`backend/src/socket/*`) tekshir.
- Deploy: backend → Render; frontend → Netlify (rejada, `netlify.toml`).
- Kod izohlari va UI matnlari o'zbek tilida (lotin). Yangi kod ham shu uslubda bo'lsin.
- Kamchiliklar ro'yxati va ustuvorligi — 8-bo'limda, reja — 10-bo'limda.
