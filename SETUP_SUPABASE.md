# Nederlands Samen – telepítési ellenőrzőlista

## Mi készült el?
- A gyakorlófelület **kizárólag** a `public.questions` táblából tölti a kérdéseket; a helyes válaszokat nem tölti le.
- A válaszokat a `check-answer` Edge Function ellenőrzi, és román magyarázatot küld vissza.
- Anonim Supabase Auth hitelesíti a felhasználókat.
- Az Edge Function a `register_answer_attempt` adatbázis-függvénnyel percenként legfeljebb 30 választ fogad el felhasználónként.
- A korábbi böngészőben mentett eredmények megmaradnak. A pontok továbbra is **helyben** tárolódnak; nem biztonságos ranglista-pontok.
- A közös játék továbbra is „hamarosan” állapotú.

## 1. Helyi környezet
A meglévő `.env` fájlodat **ne írd felül**, az archívum nem tartalmaz titkokat. Ha új mappába bontod ki, hozz létre `.env` fájlt a `.env.example` alapján:

```
VITE_SUPABASE_URL=https://<projekt>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Ezek kizárólag nyilvános kliensoldali kulcsok. A `SUPABASE_SECRET_KEY` és a `SUPABASE_SERVICE_ROLE_KEY` **soha** ne kerüljön `VITE_` változóba vagy Gitbe.

## 2. Adatbázis
A már létrehozott `answer_attempts` tábla után futtasd a Supabase SQL Editorban a
`supabase/migrations/20261118_006_create_rate_limit_function.sql` fájl tartalmát.
Ha már lefuttattad, ne ismételd feleslegesen.

Ellenőrizd, hogy az aktív kérdések olvashatók az `authenticated` szerepkörrel, de a `question_answers` és `question_translations` táblák nem publikusak.

**Figyelem:** A Dashboardban kézzel futtatott migrációk nem feltétlenül jelennek meg a CLI migrációs előzményeiben. Ne futtass automatikusan `supabase db push` parancsot a migrációs állapot egyeztetése nélkül.

## 3. Edge Function telepítése
A projekt gyökeréből:

```
npx supabase login
npx supabase link --project-ref <projekt-ref>
npx supabase functions deploy check-answer --no-verify-jwt
```

A `--no-verify-jwt` szándékos: a függvény saját maga ellenőrzi a **felhasználói** JWT-t a `supabase.auth.getUser(token)` hívással. Így az új `sb_publishable_` kulcs mellett is működik. JWT nélkül a függvény 401-et ad.

A Supabase által alapértelmezetten biztosított `SUPABASE_URL`, `SUPABASE_ANON_KEY` és `SUPABASE_SERVICE_ROLE_KEY` környezeti változókat használja, illetve az új `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` változókat, ha ezek is rendelkezésre állnak. Ha 500-as konfigurációs hiba jelentkezik, az Edge Function környezeti változóit ellenőrizd; a titkos kulcsot ne oszd meg.

## 4. Frontend teszt

```
npm ci
npm run build
npm run dev
```

Próba: becenév → „Exersează mixt” → kérdés → válasz → „Verifică”. A böngésző Network paneljén a `questions` lekérés és a `functions/v1/check-answer` POST is meg kell jelenjen. A válasz nem szerepelhet a `questions` API válaszában.

Ha 401: Auth session / token; ha 404: függvény nem települt vagy kérdés inaktív; ha 429: rate limit; ha 500: Edge Function logs / DB RPC / környezeti változók.

## Korlátok
- A rate limit felhasználónként érvényes, anonim fiókok újragenerálásával megkerülhető. Éles, díjazott versenyhez további védelem szükséges.
- A szerver ellenőrzi a helyességet, de az első ellenőrzés után visszaküldi a javasolt választ és magyarázatot. Ez tanulási módhoz megfelelő, zárt versenyhez nem.
- A helyi eredmények nem szinkronizálódnak különböző eszközök között.
- A feltöltött archívumban nem voltak telepített `node_modules` függőségek; itt a buildet hálózati függőségtelepítési korlát miatt nem lehetett teljesen lefuttatni. A helyi `npm ci && npm run build` kötelező ellenőrzés.
