# Vivliothiki Books

Πλατφόρμα αυτοέκδοσης και πώλησης βιβλίων σε κάθε γλώσσα, με έμφαση στην ελληνική αγορά.
Οι συγγραφείς ανεβάζουν τα βιβλία τους, οι αναγνώστες αγοράζουν, και κάθε έντυπο τυπώνεται κατά παραγγελία
(Lulu Print API) ή αποστέλλεται από απόθεμα που τυπώθηκε σε τοπικό τυπογραφείο.

## Τι κάνει

- **Αναγνώστες:** κατάλογος με φίλτρα γλώσσας και κατηγορίας, σελίδες βιβλίων και συγγραφέων, αγορά με Stripe (κάρτα, Apple Pay, Google Pay), λήψη ebook με προσωπικό σύνδεσμο.
- **Συγγραφείς:** εγγραφή χωρίς κωδικό (σύνδεσμος στο email), δημιουργία βιβλίου, ανέβασμα PDF εσωτερικού και εξωφύλλου ή EPUB, τιμή ανά μορφή με αυτόματο κόστος εκτύπωσης από τη Lulu και εκτίμηση κέρδους, υποβολή για έλεγχο, σύνοψη πωλήσεων.
- **Διαχείριση:** έγκριση ή απόρριψη βιβλίων, απόθεμα ανά μορφή, λίστα παραγγελιών προς αποστολή από απόθεμα, παραγγελίες με σφάλματα.
- **Εκτέλεση παραγγελίας:** αν υπάρχει απόθεμα, η παραγγελία φεύγει από εκεί. Αλλιώς στέλνεται αυτόματα στη Lulu, που τυπώνει και αποστέλλει απευθείας στον αναγνώστη. Ο αναγνώστης δεν βλέπει πουθενά τη Lulu.
- Ελληνικά και αγγλικά (`/el`, `/en`).

## Τεχνολογία

Next.js 15 (App Router), Supabase (Postgres, σύνδεση χρηστών, αρχεία), Stripe Checkout, Lulu Print API, Tailwind CSS.
Φιλοξενία: Vercel (το δωρεάν πακέτο αρκεί στην αρχή).

## Στήσιμο

1. **Supabase:** νέο project στο supabase.com. Στο SQL editor τρέξτε το `supabase/migrations/0001_init.sql`.
   Στο Authentication → URL Configuration βάλτε το site URL και το `https://<domain>/auth/callback` στα Redirect URLs.
2. **Stripe:** λογαριασμός στο stripe.com. Δημιουργήστε webhook προς `https://<domain>/api/stripe/webhook`
   για τα events `checkout.session.completed` και `checkout.session.async_payment_succeeded`.
   Ενεργοποιήστε τις αποδείξεις email (Settings → Emails): εκεί ο αναγνώστης λαμβάνει και τον σύνδεσμο του ebook.
3. **Lulu:** λογαριασμός στο developers.lulu.com, πρώτα στο sandbox (`api.sandbox.lulu.com`).
   Καταχωρήστε webhook `PRINT_JOB_STATUS_CHANGED` προς `https://<domain>/api/lulu/webhook?secret=<LULU_WEBHOOK_SECRET>`.
   Ελέγξτε τα `PRINT_PACKAGES` στο `src/lib/lulu.ts` με μια δοκιμαστική παραγγελία πριν περάσετε σε production.
4. Αντιγράψτε το `.env.example` σε `.env.local` και συμπληρώστε τα κλειδιά.
5. `npm install && npm run dev`, και ανοίξτε το http://localhost:3000.
6. Κάντε τον εαυτό σας διαχειριστή: συνδεθείτε μία φορά και τρέξτε στο SQL editor
   `update profiles set is_admin = true where id = (select id from auth.users where email = '<το email σας>');`

## Εντολές

- `npm run dev`: τοπικός server
- `npm test`: unit tests (τιμολόγηση, slugs)
- `npm run build`: build για production

## Οικονομικά

Το `src/lib/pricing.ts` υπολογίζει για κάθε πώληση τον ΦΠΑ 6% (βιβλία, Ελλάδα), τη χρέωση Stripe, το κόστος εκτύπωσης
(Lulu ή απόθεμα), την προμήθεια της πλατφόρμας (`PLATFORM_COMMISSION_PERCENT`) και το κέρδος του συγγραφέα.
Ο αναγνώστης πληρώνει μεταφορικά `SHIPPING_FEE_CENTS`. Η διαφορά από το πραγματικό κόστος αποστολής βαραίνει την πλατφόρμα.
Τα ποσοστά ΦΠΑ και η τιμολόγηση (myDATA) πρέπει να επιβεβαιωθούν με λογιστή.

## Επόμενα βήματα

- Πληρωμές συγγραφέων (Stripe Connect) και μηνιαίες αναφορές δικαιωμάτων
- Ηλεκτρονική τιμολόγηση myDATA μέσω παρόχου
- Αυτόματος έλεγχος αρχείων από τη Lulu (`validateInterior`, `validateCover`) κατά την υποβολή
- Αυτόματο barcode EAN-13 από το ISBN
- Καλάθι με πολλά βιβλία, κουπόνια, αξιολογήσεις, αναζήτηση
- Πληρωμή με IRIS (Viva Wallet)
