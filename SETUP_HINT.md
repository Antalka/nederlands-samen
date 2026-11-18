# Indiciu válaszadás előtt – telepítés

A projekt új `get-hint` Edge Functiont és frontend bekötést tartalmaz. **Nincs szükség új SQL-táblára vagy migrációra.** A meglévő `question_translations.hint` mezőt olvassa. A helyes válasz és a magyarázat nem kerül ki a hint API-ból.

1. Másold át a projektfájlokat a működő projektedbe (előtte biztonsági másolat).
2. A projekt gyökerében: `npx supabase functions deploy get-hint --no-verify-jwt`
3. `npm run build`, majd `npm run dev`.
4. Teszt: új kérdés → **Indiciu** → román segítség → válasz → **Verifică** → értékelés.

A `--no-verify-jwt` szükséges lehet a publishable key használata mellett; **a függvény maga ellenőrzi a felhasználói JWT-t** a Supabase Auth segítségével. Az Edge Function csak a román `hint` mezőt adja vissza. A `check-answer` funkciót nem kell újratelepíteni.

Ha nem jelenik meg segítség: Chrome DevTools → Network → `get-hint` státuszkód, illetve Supabase Edge Functions → Logs. Ha a `hint` mező üres, az alkalmazás ezt jelzi.
