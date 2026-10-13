# CodeKids — to'liq texnik tahlil (MVP holati)

> Tahlil sanasi: 2026-10-13. Barcha backend va frontend fayllari qatorma-qator o'qildi (~7 500 qator kod).
> Build/testlar ishga tushirilmadi (`node_modules` o'rnatilmagan) — xulosalar kodni o'qish asosida.
> Fayl havolalari `papka/fayl.js:qator` ko'rinishida.

---

## 0. Qisqa xulosa

**CodeKids** — o'qituvchi sinf uchun **jonli o'yin xonasi** ochadigan, o'quvchilar 6 belgili kod bilan kirib
**Typing Race** (tez yozish poygasi) yoki **3D Labirint** (savol-javobli labirint) o'ynaydigan ta'lim platformasi.
Ro'yxatdan o'tmagan mehmon ham typing mashq qila oladi.

- **Backend:** Node 20 + Express 5 + Socket.io + PostgreSQL (Neon). Render'da (`codekids-api.onrender.com`).
- **Frontend:** Vanilla JS (framework yo'q) + Vite + Three.js. GitHub Pages'da (`/codekids/`), PWA.
- **Holati:** asosiy oqimlar ishlaydi, xavfsizlik asoslari yaxshi qilingan (token rotation, server hisoblaydigan
  natija, Zod validatsiya). Lekin **real maktab sharoitida** darhol chiqadigan 4 ta kritik muammo bor (7-bo'lim):
  1. Bir sinf bitta IP orqali chiqadi → rate-limit butun sinfni bloklaydi.
  2. Frontend va backend turli domenlarda → Safari/iPad'da sahifa yangilansa login uchadi.
  3. Typing poygasida g'olibni klient yuborgan raqam belgilaydi → oson aldash mumkin.
  4. Typing "aniqlik" (accuracy) har doim ~100% → ustoz analitikasi ma'nosiz.

---

## 1. Loyiha maqsadi va mahsulot mantig'i

**Kim uchun:** maktab/o'quv markazi o'qituvchilari va 7–14 yoshli bolalar (UI o'zbekcha, qisman ruscha).

**Rollar:**
| Rol | Nima qila oladi |
|---|---|
| `teacher` | Savollar to'plami yaratadi (CSV yoki UI'da tahrirlash), nashr qiladi, sinf yaratadi, o'quvchini email bilan qo'shadi, xona ochadi, o'yinni boshlaydi/yopadi, o'yinchini chiqaradi (kick), analitika ko'radi |
| `student` | Kod bilan xonaga kiradi, typing/labirint o'ynaydi, solo typing mashq qiladi |
| mehmon | Login'siz typing mashq (natija saqlanmaydi) |

**O'yinlar:**
1. **Typing Race** — server tasodifiy matn beradi (uz/ru). Solo yoki xonada poyga. WPM va aniqlik **serverda**
   hisoblanadi. Xonada har o'quvchi mashinachasi yo'lakda yuradi (jonli progress).
2. **Labirint** — server seed asosida labirint yaratadi (DFS). 6–12 ta checkpoint'da savol chiqadi
   (ustozning savollar to'plamidan). To'g'ri javob +10 ball, noto'g'ri — 5 s qulf, oxirgi checkpoint'ga qaytish,
   `standard` rejimda −1 jon (3 jon), `kids` rejimda jon yo'q. Marraga yetish bonusi: 1-o'rin +50, 2-+30, 3-+20, qolgan +10.
   Klient faqat yo'nalish yuboradi, harakatni server tekshiradi (server-authoritative).

---

## 2. Arxitektura

```
[GitHub Pages: frontend (Vite build, PWA)]
        │  REST /api/v1 (Bearer access token, refresh = httpOnly cookie)
        │  Socket.io (auth: {token})
        ▼
[Render: Node/Express 5 + Socket.io]  ── xona holati XOTIRADA (Map) ──
        │
        ▼
[Neon PostgreSQL]  (schema.sql, migratsiya = bitta SQL fayl)
```

**Papka tuzilmasi:**
```
.github/workflows/deploy-frontend.yml   # faqat frontend → GitHub Pages
backend/
  schema.sql                 # butun DB sxemasi (idempotent), oxirida ALTER'lar qo'shilgan
  docs/API.md                # API shartnomasi (yaxshi yozilgan)
  scripts/                   # migrate, seed-typing(-long), dev/test skriptlar (autoplay, emit, solve...)
  src/server.js              # Express + Socket.io, graceful shutdown
  src/db.js                  # pg Pool + withTransaction
  src/errors.js, logger.js   # AppError, yagona xato formati, pino (maxfiy maydonlar redact)
  src/middleware/            # auth (JWT), security (helmet, cors, rate-limit), validate (zod)
  src/schemas/               # zod sxemalar
  src/routes/                # auth, contents, typing, guest, rooms, teacher
  src/services/              # tokens (JWT + refresh rotation), rooms (yaratish/qo'shilish)
  src/socket/                # index (auth, throttling), rooms (typing), labyrinth, control (close/kick), roomStore (Map)
  src/utils/mazeGenerator.js # mulberry32 PRNG + DFS labirint
frontend/
  src/main.js                # hash-router, sessiyani tiklash, SW
  src/core/                  # api (401→refresh→retry), socket, state (token xotirada), settings, toast
  src/ui/                    # auth (login/register), room (join), endscreen
  src/games/typing/          # lobby, game, board (poyga paneli)
  src/games/labyrinth/       # game, factory, renderer3d (Three.js), renderer2d (fallback)
  src/teacher/               # panel (dashboard/sinf/kontent/xona), host (typing xona boshqaruvi)
  src/i18n/                  # uz (asosiy), ru (qisman)
  labyrinth/                 # ESKI prototip + mock server — hech qayerda ishlatilmaydi
codekids-frontend/.vite/...  # keraksiz qoldiq papka
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
| `game_rooms` | code (6 belgi), game_type, status (waiting/active/finished), settings JSONB (seed, size, mode), expires_at (2 soat) |
| `game_players` | room×user, score, correct, lives, pozitsiya, `state` JSONB (checkpoint/savol holati), kicked, rank |
| `classes`, `class_students` | ustoz sinflari |
| `refresh_tokens` | faqat SHA-256 hash, `family_id` (reuse aniqlash) |

Indekslar o'ylab qo'yilgan (trigram qidiruv, leaderboard partial index). Migratsiya tizimi yo'q — bitta
idempotent SQL fayl, yangi o'zgarishlar oxiriga `ALTER ... IF NOT EXISTS` bilan qo'shilgan.

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

### 4.3 Typing (`routes/typing.js`, `routes/guest.js`)
- `POST /typing/sessions` → server matnni tanlaydi (berilmasa tasodifiy, til bo'yicha), sessiya yaratadi.
- `POST /typing/results` → `FOR UPDATE` bilan bir martalik, <2 s bo'lsa `TOO_FAST`, server `computeMetrics`:
  pozitsiya bo'yicha to'g'ri belgilar, WPM = to'g'ri/5/daqiqa, accuracy = to'g'ri/yozilgan.
- Mehmon: matn va boshlanish vaqti imzolangan JWT ichida (alohida kalit), ishlatilgan `jti` lar xotiradagi `Map`da.

### 4.4 Xonalar (`services/rooms.js`, `routes/rooms.js`)
- Kod alfavitida 0/O/1/I yo'q (bolalar adashmasligi uchun), 5 marta urinish.
- Labirint uchun seed serverda yaratiladi, kamida 3 savol talab qilinadi.
- Join: `FOR UPDATE` bilan max_players tekshiruvi, qayta kirish (rejoin) qo'llab-quvvatlanadi, kicked bloklanadi.
- Host: `/rooms/mine`, `/rooms/:code/close`, `/rooms/:code/players/:id/kick`.

### 4.5 Socket (`socket/*`)
- Auth: token yoki mehmon `deviceId` (mehmon uchun handler yo'q — amalda ishlatilmaydi).
- Har socket'ga 15 event/s throttling; har event `wrapHandler` → `{ok, ...}` ack yoki `{ok:false, error}`.
- **Typing xona** (`socket/rooms.js`): `room:join`, `room:start` (host), `room:progress` (klient `correct` sonini
  yuboradi). 250 ms tick: o'zgargan xonalarga `room:snapshot` broadcast, vaqt tugasa `room:finished` + DB'ga rank.
- **Labirint** (`socket/labyrinth.js`): xona DB'dan yuklanadi va labirint seed'dan qayta tiklanadi;
  checkpoint'lar BFS asosiy yo'l + chetki kataklardan aralash tanlanadi; har o'yinchiga savol tartibi va
  variantlar deterministik aralashtiriladi; o'yinchi holati (`state` JSONB) har harakatda DB'ga yoziladi
  → server qayta ishga tushsa ham davom ettirish mumkin. Taymer `setTimeout` bilan.
- `control.js`: REST'dan socket'ga ko'prik (close/kick → `kicked` event, kanaldan chiqarish).

### 4.6 Ustoz (`routes/teacher.js`)
- Sinflar CRUD, o'quvchini **email** orqali qo'shish, dashboard sonlari.
- Analitika: faqat **typing_results** asosida (o'rtacha WPM/accuracy, "zaif mavzular" = past accuracy).
  Labirint natijalari analitikaga umuman kirmaydi.

---

## 5. Frontend — ekranlar va oqimlar

- **Router:** hash (`#/`, `#/typing`, `#/guest`, `#/room/CODE`, `#/teacher`, `#/host/CODE?game=`), rol bo'yicha
  himoya, lazy import, `seq` bilan eski render'ni bekor qilish (`src/main.js`).
- **Auth:** access token faqat xotirada (XSS'ga chidamliroq), reload'da `/auth/refresh` (cookie) orqali tiklanadi.
  API klient 401 → bitta (single-flight) refresh → qayta urinish (`src/core/api.js`).
- **Typing** (`src/games/typing/game.js`): yashirin input + har belgini span bilan chizish; **noto'g'ri belgi
  kiritilsa darhol o'chiriladi** (shake effekti); sessiya `sessionStorage`da — reload'dan keyin davom etadi;
  xonada har 250 ms `room:progress` yuboradi.
- **Labirint** (`src/games/labyrinth/game.js`): klaviatura (strelka/WASD), D-pad (bosib turish), swipe;
  optimistik harakat + server javobi bilan tuzatish; server vaqti bilan sinxron taymer; 3D (InstancedMesh, past
  quvvat rejimi, FPS tushsa avtomatik) yoki WebGL bo'lmasa 2D canvas.
- **Ustoz paneli** (`src/teacher/panel.js`): Dashboard / Sinflar (+analitika jadvali) / Kontent (CSV yuklash,
  savollarni UI'da tahrirlash, nashr) / Xona (yaratish, faol xonalar ro'yxati).
- **PWA:** manifest + service worker (navigatsiya network-first, statik stale-while-revalidate, backend keshlanmaydi).
- Tema (kun/tun), past quvvat rejimi, `prefers-reduced-motion` hisobga olinadi.

---

## 6. Asosiy foydalanuvchi oqimlari

**Ustoz:** register (role=teacher) → Kontent → CSV yuklash → Nashr → Xona → "Yangi xona" (Labirint: to'plam,
o'lcham, rejim, daqiqa / Typing: til) → host ekrani (katta kod) → o'quvchilar kirgach "Boshlash" → jonli reyting →
vaqt tugaydi yoki "Yopish" → yakuniy reyting.

**O'quvchi:** register (email+parol+nickname) → bosh sahifada kod kiritadi → `POST /rooms/join` → o'yin turiga qarab
typing yoki labirint ekrani → ustoz boshlashini kutadi → o'ynaydi → yakuniy reyting.

**Mehmon:** login ekrani → "Mehmon sifatida mashq" → til → typing → natija (saqlanmaydi).

---

## 7. Kamchiliklar (ustuvorlik bo'yicha)

### 🔴 Kritik — real sinfda darhol chiqadi

1. **Rate-limit IP bo'yicha, maktabda hamma bitta IP'da.**
   `backend/src/middleware/security.js:51-67` — umumiy limit 15 daqiqada 300 so'rov/IP, login/register — 10 ta
   muvaffaqiyatsiz urinish/IP. 25–30 bola bitta Wi-Fi/NAT orqali chiqadi: bir necha bola parolni xato tersa —
   butun sinf 15 daqiqaga login qila olmaydi; o'yin davomidagi REST so'rovlar ham 300 limitni tez to'ldiradi.
   *Yechim:* autentifikatsiyalangan so'rovlarni `user.id` bo'yicha cheklash, authLimiter'ni `email+IP` kalit bilan,
   limitlarni oshirish.

2. **Frontend (github.io) va backend (onrender.com) turli saytlarda → refresh cookie "third-party".**
   `backend/src/services/tokens.js:171-177`, `frontend/src/core/config.js:2`. Access token faqat xotirada
   saqlanadi, shuning uchun reload'da sessiya faqat cookie orqali tiklanadi. Safari/iOS (iPad'lar!) va
   inkognito rejimi third-party cookie'ni bloklaydi → **har reload'da qayta login**. Yana: `COOKIE_SECURE=true`
   o'rnatilmasa `SameSite=Lax` bo'lib, cross-site'da umuman ishlamaydi. Render bepul tarifida birinchi so'rov
   30–60 s "uyg'onadi".
   *Yechim:* bitta domen ostiga olish (masalan `codekids.uz` + `api.codekids.uz`) yoki frontend'ni backend bilan
   bir origin'dan berish.

3. **Typing poygasida natijani klient belgilaydi — aldash juda oson.**
   `backend/src/socket/rooms.js:200-232` — `room:progress {correct}` faqat "kamaymasin" va "matndan oshmasin"
   deb tekshiriladi. Brauzer konsolida bitta `emit('room:progress', {code, correct: 9999...})` bilan 1-o'rin.
   Yakuniy rank (`rankPlayers`, `rooms.js:288`) aynan shu raqamga va `finishedAt`ga asoslanadi; serverda
   hisoblangan `typing_results` rank'ga ta'sir qilmaydi.
   *Yechim:* progressni vaqtga nisbatan cheklash (masalan, ≤ 15 belgi/s), yoki yakuniy reytingni server
   hisoblagan `typing_results` (WPM) bo'yicha tuzish.

4. **Typing aniqligi (accuracy) doim ~100% — analitika ma'nosiz.**
   `frontend/src/games/typing/game.js:173-182` noto'g'ri belgini darhol o'chiradi, server esa faqat yakuniy
   matnni oladi (`backend/src/routes/typing.js:15-31`) — yakuniy matn doim to'g'ri prefiks. Natijada ustozning
   "zaif mavzular" va o'rtacha aniqlik ko'rsatkichlari (`routes/teacher.js:144-186`) har doim 100% atrofida.
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

7. **Typing xonasida "Chiqarish" (kick) tugmasi umuman chiqmaydi.**
   `frontend/src/teacher/host.js:42` `renderBoard(..., { kickable: true })` chaqiradi, lekin
   `frontend/src/games/typing/board.js:11` bu parametrni qo'llamaydi — `data-kick` tugmalari yaratilmaydi.
   Labirintda kick ishlaydi.

8. **Xona/sessiya hayot sikli yopilmagan.**
   - Muddati o'tgan (2 soat) xonalarni hech kim `finished` qilmaydi — DB'da abadiy `waiting/active`.
   - Hech qachon boshlanmagan xonalar xotiradagi `Map`dan o'chmaydi (`socket/roomStore.js`) — sekin memory leak.
   - `refresh_tokens`, `typing_sessions` jadvallari tozalanmaydi.
   - Holat bitta process xotirasida (`roomStore`, mehmon `usedTokens` — `routes/guest.js:23`) → faqat 1 instance,
     restart'da mehmon tokenlari qayta ishlatilishi mumkin.
   *Yechim:* davriy cleanup job (cron/`setInterval`), keyinchalik Redis.

9. **Labirintda har qadam = 1 ta DB UPDATE.** `backend/src/socket/labyrinth.js:490` (`savePlayer` har move'da).
   30 o'quvchi × ~5 qadam/s ≈ 150 yozuv/s Neon bepul tarifiga. *Yechim:* xotirada saqlab, 1–2 s da bir marta
   yoki faqat muhim hodisalarda (savol, finish) yozish.

10. **O'quvchi o'z natijalarini ko'ra olmaydi; labirint analitikasi yo'q.**
    O'quvchi tarixi / eng yaxshi WPM / reyting (leaderboard) endpoint'i yo'q (indeks bor, endpoint yo'q).
    Labirintdagi har savolga javob saqlanmaydi → qaysi savol/mavzu qiyinligini bilib bo'lmaydi.
    *Yechim:* `question_attempts` jadvali, `GET /me/results`, leaderboard endpoint.

### 🟡 O'rta

11. **Hamma tugatsa ham o'yin tugamaydi** — typing ham, labirint ham taymer (default 10 daq) yoki ustoz "Yopish"ini
    kutadi (`socket/rooms.js:259-275`, `socket/labyrinth.js:348-354`). Bolalar bekor kutadi.
12. **Ustoz UI'da typing matni yaratib bo'lmaydi**, API orqali yaratilsa ham `language` berilmaydi
    (`schemas/contents.js:36-53`) → `NULL` til bilan tasodifiy tanlovga (`services/rooms.js:41-44`,
    `routes/typing.js:40-48`) hech qachon tushmaydi. Typing matnlari faqat seed skriptlardan keladi.
13. **Xona yaratishda savollar to'plami ro'yxati** — barcha ustozlarning ochiq lentasidan, birinchi 50 tasi
    (`frontend/src/teacher/panel.js:274`); o'zining eski to'plami ko'rinmay qolishi mumkin.
14. **Tugagan xonalar ro'yxati hisoblanadi, lekin ko'rsatilmaydi** — `panel.js:254` dagi `done` ishlatilmaydi.
15. **`lab-host` CSS klassi `#app`da qolib ketadi** — `labyrinth/game.js:30-31` uni qo'yadi, cleanup olib
    tashlamaydi → labirint host'dan ustoz paneliga qaytilsa panel 2 ustunli grid bo'lib buziladi (desktop'da).
16. **Typing'da "men" belgilanmaydi** — `game.js:46` `meId` hech qachon o'rnatilmaydi → o'z yo'lagi ajratilmaydi.
17. **Xonadagi typing tili doim `uz` yoziladi** — `ui/room.js:21` `room.language` ni o'qiydi, lekin backend
    `publicRoom` uni qaytarmaydi (rus matnli xonada statistika noto'g'ri tilda).
18. **WPM vaqt bazasi farq qiladi** — server sessiya yaratilgan paytdan (`routes/typing.js:147`), klient birinchi
    tugma bosilgandan (`game.js:178`) hisoblaydi → ekrandagi va saqlangan WPM farq qiladi.
19. **Chiqarilgan (kicked) o'yinchilar `max_players`ga hisoblanadi** (`services/rooms.js:153-158`).
20. **Tick ketma-ket va xatoga chidamsiz** — bitta xonani yopishda DB xatosi bo'lsa, u har 250 ms qayta urinadi va
    boshqa xonalarni kechiktiradi (`socket/rooms.js:259-270`).
21. **Kids rejimida server restart'dan keyin o'rinlar qayta 1 dan boshlanadi** — `labyrinth.js:171-174`
    `lives > 0` sharti `lives = NULL` (kids) bo'lganda ishlamaydi.
22. **Mehmon tokeni ichida butun matn** — `schemas/typing.js:21` token ≤4000 belgi; 1400+ belgili ruscha matn
    bo'lsa natija yuborib bo'lmaydi (hozirgi seed matnlar ≤383 belgi, shuning uchun hozircha yashirin xato).

### ⚪ Past (tozalik, qo'llab-quvvatlash)

23. **O'lik kod/keraksiz fayllar:** `frontend/labyrinth/` (eski prototip + mock server), `panel.js:320` `roomsOld`,
    `mazeGenerator.js` dagi `isCheckpoint`, `codekids-frontend/.vite/`, `backend/savollar.csv`, `backend/xato.csv`,
    `server.js:51-54, 62` dagi eskirgan izohlar, `contents.js:79` va `rooms.js:34` dagi joyidan adashgan izohlar,
    `schemas/rooms.js:30` dagi hech qachon ishlamaydigan typing xabari.
24. **i18n deyarli ishlamaydi** — `setLang` hech qayerda chaqirilmaydi (til almashtirgich yo'q), ko'p matnlar
    kodga qattiq yozilgan, `ru.js` qisman.
25. **Test, CI, hujjat:** backend uchun test yo'q (faqat eski mock'da bitta test), CI faqat frontend deploy;
    `.env.example` yo'q (kerakli o'zgaruvchilar: `DATABASE_URL`, `JWT_ACCESS_SECRET` ≥32, `CORS_ORIGIN`,
    `COOKIE_SECURE`, `PORT`, `LOG_LEVEL`, `RATE_LIMIT_*`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`);
    root README yo'q; backend deploy konfiguratsiyasi (render.yaml/Dockerfile) yo'q.
26. API'da bor, UI'da yo'q: like, qidiruv, unpublish (API'da ham yo'q), parol tiklash, profil.
27. `scripts/seed-typing-long.mjs:6` — `DATABASE_URL` yo'q bo'lsa xato o'rniga URL chiqaradi.

---

## 8. Yaxshi qilingan jihatlar (saqlab qolish kerak)

- **Server-authoritative dizayn:** labirint harakati, savol javobi, typing WPM/aniqlik — barchasi serverda.
- **Auth sifati:** refresh rotation + reuse detection, DB'da faqat hash, timing-safe login, access token
  localStorage'da emas.
- **Validatsiya:** hamma joyda Zod, parametrlangan SQL (SQL injection yo'q), yagona xato formati, `esc()` bilan
  XSS'dan himoya izchil.
- **Concurrency:** `FOR UPDATE` (join, refresh, natija), bir martalik sessiyalar.
- **Qayta ulanish:** labirint holati DB'da, typing progressi `sessionStorage`da — reload/uzilishdan keyin davom etadi.
- **Deterministik labirint** (seed) — klientga faqat grid ketadi, javoblar ketmaydi; variantlar o'yinchiga xos aralashtiriladi.
- **Frontend sifati:** lazy chunk'lar (Three.js alohida), 3D→2D fallback, past quvvat rejimi, reduced-motion,
  PWA, mobil boshqaruv (D-pad, swipe).
- **Hujjat:** `backend/docs/API.md` aniq va to'liq.

---

## 9. MVP uchun tavsiya etilgan ish rejasi (tartib bilan)

1. **Domen va cookie:** frontend + backend bitta sayt ostida (custom domen) → Safari/iPad muammosi yo'qoladi.
2. **Rate-limit:** user.id bo'yicha, auth uchun email+IP; limitlarni sinf hajmiga moslash.
3. **Typing adolati:** progressni tezlik bo'yicha cheklash; yakuniy reytingni server natijasidan olish;
   xatolar sonini hisoblash (accuracy).
4. **Ustoz va bola xavfsizligi:** ustozni tasdiqlash; o'quvchi uchun email'siz login (sinf kodi + PIN);
   kontentni default xususiy qilish.
5. **Hayot sikli:** muddati o'tgan xonalarni yopish, xotirani tozalash, eski token/sessiyalarni o'chirish;
   hamma tugatganda o'yinni avtomatik yakunlash.
6. **Analitika:** `question_attempts` jadvali (labirint), o'quvchi tarixi va leaderboard endpoint'lari + UI.
7. **Kichik buglar:** typing kick, `lab-host` leak, `meId`, tugagan xonalar ro'yxati, xona tili, kontent tanlash
   ("mening to'plamlarim"), typing matni yaratish UI.
8. **Tozalash:** o'lik kod va fayllarni o'chirish, `.env.example`, README, `computeMetrics`/maze/token uchun
   unit testlar, backend CI.
9. **Masshtab (keyinroq):** labirint saqlashni batch qilish, Redis roomStore (fayl shunga tayyorlangan).

---

## 10. Boshqa AI yordamchi uchun kontekst (shu faylni yuklagan Claude uchun)

Sen CodeKids loyihasida yordam beryapsan. Muhim faktlar:
- Monorepo: `backend/` (Node 20, ESM, Express 5, Socket.io 4, pg, zod, pino) va `frontend/` (Vanilla JS ESM,
  Vite 5, Three.js 0.169, socket.io-client). Framework (React va h.k.) yo'q — DOM `html()` template helper bilan.
- API prefiksi `/api/v1`, xato formati `{ error: { code, message, details? } }`, socket ack `{ ok, ... }`.
- Xona holati process xotirasida (`backend/src/socket/roomStore.js`), DB — Neon PostgreSQL, sxema `backend/schema.sql`.
- Deploy: frontend → GitHub Pages (`/codekids/` base), backend → Render.
- Kod izohlari va UI matnlari o'zbek tilida (lotin). Yangi kod ham shu uslubda bo'lsin.
- Kamchiliklar ro'yxati va ustuvorligi — 7-bo'limda, reja — 9-bo'limda.
