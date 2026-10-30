// Marketing copy for the main menu and the home page, kept apart from the app's UI strings.
// Links are paths without the locale ("/books", "#faq"); the components add "/el" or "/en".
import type { Locale } from "./config";
import type { IconName } from "@/components/icons";

export interface MenuItem {
  icon: IconName;
  title: string;
  text: string;
  href?: string; // no href: shown as "coming soon"
}
export interface MenuColumn {
  heading: string;
  items?: MenuItem[];
  links?: [string, string][];
}
export interface MenuFeature {
  art: string;
  tone: "forest" | "burgundy" | "espresso";
  kicker: string;
  text: string;
  href: string;
}
export type MenuEntry = { label: string; href: string } | { label: string; columns: MenuColumn[]; features: MenuFeature[] };

const el = {
  utility: { books: "Τα βιβλία μου", sales: "Οι πωλήσεις μου", account: "Λογαριασμός", login: "Σύνδεση" },
  soon: "σύντομα",
  menuLabel: "Κύριο μενού",
  openMenu: "Μενού",
  menu: [
    {
      label: "Λύσεις",
      columns: [
        {
          heading: "Για ποιον",
          items: [
            { icon: "pen", title: "Συγγραφείς", text: "Εκδώστε μόνοι σας, χωρίς προκαταβολή και χωρίς ελάχιστη ποσότητα.", href: "/dashboard" },
            { icon: "building", title: "Εκδότες και σχολεία", text: "Τυπώστε κατά παραγγελία, χωρίς αποθήκη και απούλητα.", href: "#for-whom" },
            { icon: "people", title: "Σύλλογοι και δήμοι", text: "Λευκώματα, οδηγοί και εκδόσεις εκδηλώσεων.", href: "#for-whom" },
          ],
        },
        {
          heading: "Πωλήσεις",
          items: [
            { icon: "shop", title: "Βιβλιοπωλείο Vivliothiki", text: "Το βιβλίο σας στα ράφια μας, για αναγνώστες σε όλη την Ελλάδα.", href: "/books" },
            { icon: "globe", title: "Amazon, Skroutz, Public και άλλα", text: "Το βιβλίο σας σε 14 κανάλια πωλήσεων, με ένα κλικ.", href: "#channels" },
            { icon: "link", title: "Σύνδεσμος αγοράς", text: "Πουλήστε από το δικό σας site, το Instagram ή το Facebook." },
            { icon: "stack", title: "Παραγγελίες σε ποσότητα", text: "Τύπωμα σε ελληνικό τυπογραφείο για 100 αντίτυπα και πάνω.", href: "#faq" },
          ],
        },
      ],
      features: [
        { art: "Το βιβλίο σας, στο ράφι σε 4 βήματα", tone: "forest", kicker: "Οδηγός", text: "Από το αρχείο σας στα χέρια του αναγνώστη.", href: "#how" },
        { art: "Ελληνικά βιβλία και στο Amazon", tone: "burgundy", kicker: "Γιατί εμείς", text: "Το KDP δεν δέχεται ελληνικά. Εμείς τα πουλάμε εκεί για εσάς.", href: "#channels" },
      ],
    },
    {
      label: "Προϊόντα",
      columns: [
        {
          heading: "Προϊόντα",
          items: [
            { icon: "book", title: "Έντυπα βιβλία", text: "Μαλακό ή σκληρό εξώφυλλο, ασπρόμαυρα ή έγχρωμα, σε πολλά μεγέθη.", href: "/books" },
            { icon: "tablet", title: "Ebooks", text: "EPUB και PDF, με λήψη αμέσως μετά την πληρωμή.", href: "/books" },
            { icon: "calendar", title: "Ημερολόγια", text: "Τοίχου, με τις δικές σας φωτογραφίες ή εικονογραφήσεις." },
          ],
        },
        {
          heading: "Δημοφιλείς μορφές",
          links: [
            ["Μυθιστορήματα", "/books?category=fiction"],
            ["Παιδικά βιβλία", "/books?category=children"],
            ["Αστυνομικά", "/books?category=crime"],
            ["Ποίηση", "/books?category=poetry"],
            ["Εκπαιδευτικά", "/books?category=education"],
            ["Πολύγλωσσες εκδόσεις", "/books"],
          ],
        },
      ],
      features: [{ art: "Από το αρχείο στο χαρτί", tone: "espresso", kicker: "Πώς λειτουργεί", text: "Τι γίνεται από τη στιγμή που ανεβάζετε το βιβλίο.", href: "#how" }],
    },
    { label: "Τιμές", href: "#pricing" },
    { label: "Δημιουργία", href: "/dashboard" },
    {
      label: "Οδηγοί",
      columns: [
        {
          heading: "Οδηγοί",
          items: [
            { icon: "guide", title: "Οδηγοί και πρότυπα", text: "Μεγέθη σελίδας, περιθώρια, εξώφυλλο, ISBN." },
            { icon: "bulb", title: "Συχνές ερωτήσεις", text: "Κόστος, ISBN, ποσότητες, πληρωμές.", href: "#faq" },
            { icon: "star", title: "Βρείτε συνεργάτη", text: "Επιμελητές, εικονογράφοι, μεταφραστές, γραφίστες." },
          ],
        },
        {
          heading: "Εργαλεία",
          items: [
            { icon: "wand", title: "Κατασκευαστής εξωφύλλου", text: "Πέντε πρότυπα, ράχη και barcode, έτοιμο για εκτύπωση.", href: "/dashboard" },
            { icon: "guide", title: "Από Word σε PDF και EPUB", text: "Ανεβάστε το .docx, πάρτε σελιδοποιημένο βιβλίο." },
            { icon: "stack", title: "Υπολογισμός κέρδους", text: "Δείτε τι κερδίζετε από κάθε αντίτυπο.", href: "#pricing" },
          ],
        },
      ],
      features: [{ art: "Πώς παίρνω ISBN στην Ελλάδα", tone: "forest", kicker: "Ερώτηση", text: "Δωρεάν από την Εθνική Βιβλιοθήκη.", href: "#faq" }],
    },
    {
      label: "Σχετικά",
      columns: [
        {
          heading: "Σχετικά",
          items: [
            { icon: "heart", title: "Ποιοι είμαστε", text: "Μια ελληνική πλατφόρμα για ανεξάρτητους συγγραφείς.", href: "#trust" },
            { icon: "shield", title: "Δικαιώματα συγγραφέων", text: "Τα δικαιώματα μένουν δικά σας. Αποχωρείτε όποτε θέλετε.", href: "#trust" },
            { icon: "mail", title: "Επικοινωνία", text: "Απαντάμε στα ελληνικά, συνήθως μέσα στη μέρα.", href: "#trust" },
          ],
        },
      ],
      features: [{ art: "Κάθε βιβλίο αξίζει μια θέση στο ράφι", tone: "burgundy", kicker: "Η ιστορία μας", text: "Γιατί φτιάξαμε τη Vivliothiki.", href: "#faq" }],
    },
    { label: "Βιβλιοπωλείο", href: "/books" },
  ] as MenuEntry[],
  home: {
    eyebrow: "Εκδόσεις για ανεξάρτητους συγγραφείς",
    title: "Εκδώστε το βιβλίο σας.",
    titleEm: "Πουλήστε το παντού.",
    lede: "Από το αρχείο Word ως τα χέρια του αναγνώστη. Χωρίς κόστος έκδοσης, χωρίς αποθήκη, χωρίς ελάχιστη ποσότητα.",
    points: [
      "Σελιδοποίηση και εξώφυλλο έτοιμα σε λεπτά",
      "Έντυπο, σκληρόδετο και ebook",
      "Skroutz, Public, Amazon και άλλα 11 κανάλια",
      "Τυπώνουμε και στέλνουμε κάθε παραγγελία",
    ],
    cta: "Εκδώστε το βιβλίο σας",
    ctaShelves: "Δείτε τα ράφια",
    glass: {
      channels: "κανάλια πωλήσεων",
      channelNames: "Skroutz · Public · Amazon · Apple Books",
      share: "Κρατάτε",
      shareText: "από ό,τι μένει μετά από ΦΠΑ, εκτύπωση και χρέωση πληρωμής",
      example: "Παράδειγμα: βιβλίο {price}",
      earn: "κερδίζετε ανά αντίτυπο",
    },
    cover: { title: "Βιβλιοθήκη", line: "Το δικό σας βιβλίο", chapter: "Κεφάλαιο 1" },
    doors: [
      { kicker: "Είμαι συγγραφέας", title: "Εκδώστε το βιβλίο σας", points: ["Χωρίς κόστος έκδοσης, χωρίς ελάχιστη ποσότητα", "Έντυπο, σκληρόδετο και ebook από τα ίδια αρχεία", "Βλέπετε το κέρδος σας πριν ορίσετε τιμή"], cta: "Ξεκινήστε δωρεάν →", href: "/dashboard" },
      { kicker: "Είμαι αναγνώστης", title: "Ανακαλύψτε ανεξάρτητους συγγραφείς", points: ["Ελληνικά βιβλία από ανεξάρτητους συγγραφείς", "Παιδικά, αστυνομικά, ποίηση, σε πολλές γλώσσες", "Παράδοση σε 5–10 εργάσιμες ή ebook αμέσως"], cta: "Δείτε τα ράφια →", href: "/books" },
    ],
    forWhom: {
      eyebrow: "Για ποιον είναι",
      title: "Μία πλατφόρμα, για όποιον έχει ένα βιβλίο να βγάλει",
      cards: [
        { title: "Συγγραφείς και δημιουργοί", text: "Εκδώστε το βιβλίο σας σε έντυπο και ebook, πουλήστε το στο βιβλιοπωλείο μας ή στο δικό σας κοινό. Χωρίς προκαταβολή.", cta: "Ξεκινήστε δωρεάν →", href: "/dashboard" },
        { title: "Εκδότες και σχολεία", text: "Τυπώστε κατά παραγγελία χωρίς αποθήκη, ή σε ποσότητα από ελληνικό τυπογραφείο. Σχολικά λευκώματα, εκπαιδευτικό υλικό, επανεκδόσεις.", cta: "Δείτε πώς λειτουργεί →", href: "#how" },
        { title: "Σύλλογοι, δήμοι, επιχειρήσεις", text: "Οδηγοί, λευκώματα επετείων, εκδόσεις εκδηλώσεων και βιβλία δώρα, σε όσα αντίτυπα χρειάζεστε.", cta: "Συχνές ερωτήσεις →", href: "#faq" },
      ],
    },
    services: {
      eyebrow: "Τι κάνουμε",
      title: "Όλα όσα χρειάζεται ένα βιβλίο, σε ένα μέρος",
      items: [
        { icon: "book", title: "Έκδοση βιβλίου", text: "Έντυπο με μαλακό ή σκληρό εξώφυλλο και ebook, από τα ίδια αρχεία. Με εργαλείο για το εξώφυλλο.", cta: "Εκδώστε το βιβλίο σας", href: "/dashboard" },
        { icon: "shop", title: "Πωλήσεις απευθείας", text: "Βιβλιοπωλείο με αναγνώστες σε όλη την Ελλάδα, και σελίδα βιβλίου που μοιράζεστε όπου θέλετε.", cta: "Δείτε το βιβλιοπωλείο", href: "/books" },
        { icon: "truck", title: "Εκτύπωση και αποστολή", text: "Κάθε παραγγελία τυπώνεται και φεύγει για τον αναγνώστη. Εσείς δεν πακετάρετε τίποτα.", cta: "Δείτε τις τιμές", href: "#pricing" },
        { icon: "globe", title: "Κάθε γλώσσα", text: "Ελληνικά, αγγλικά, γερμανικά και πολλές ακόμα. Ένα βιβλίο, πολλές εκδόσεις.", cta: "Βιβλία ανά γλώσσα", href: "/books" },
      ] as { icon: IconName; title: string; text: string; cta: string; href: string }[],
    },
    sell: {
      title: "Ο πιο εύκολος τρόπος να πουλήσετε το βιβλίο σας",
      text: "Κάθε βιβλίο έχει τη δική του σελίδα. Μοιραστείτε τη στο Instagram, στο Facebook ή στο site σας. Ο αναγνώστης πληρώνει με κάρτα ή Apple Pay, εμείς τυπώνουμε και στέλνουμε.",
      cta: "Εκδώστε το βιβλίο σας",
      mockTitle: "Οι Ιστορίες του Papa Tony",
      mockPrice: "19,90 €",
      mockBuy: "Αγορά",
    },
    channels: {
      eyebrow: "Πωλήσεις παντού",
      title: "Ένα βιβλίο, 14 κανάλια πωλήσεων",
      lede: "Το KDP του Amazon δεν δέχεται ελληνικά βιβλία. Εμείς τα πουλάμε στο Amazon από τον δικό μας λογαριασμό, μαζί με τα ελληνικά marketplaces, τα βιβλιοπωλεία και τις πλατφόρμες ebook. Εσείς απλώς διαλέγετε πού.",
      groups: [
        { title: "Προώθηση της σελίδας σας", text: "Αμέσως, με αυτόματη ενημέρωση τιμών", names: ["Skroutz", "BestPrice", "Google Shopping", "Facebook & Instagram"] },
        { title: "Marketplaces", text: "Τα καταχωρίζουμε εμείς, σε 3 με 7 εργάσιμες", names: ["Public", "Shopflix", "Amazon", "eBay"] },
        { title: "Ελληνικά βιβλιοπωλεία", text: "Τα προτείνουμε εμείς, με ISBN", names: ["Πολιτεία", "Ιανός", "Πρωτοπορία"] },
        { title: "Ebook", text: "Σε κινητά, tablet και e-readers", names: ["Google Play Books", "Apple Books", "Kobo"] },
      ],
      cta: "Ενεργοποιήστε τα από τη σελίδα του βιβλίου σας →",
    },
    how: {
      eyebrow: "Πώς λειτουργεί",
      title: "Από το αρχείο σας στα χέρια του αναγνώστη",
      lede: "Ανεβάζετε το βιβλίο, ορίζετε τιμή, και εμείς αναλαμβάνουμε τα υπόλοιπα.",
      step: "Βήμα",
      steps: [
        { title: "Ανεβάστε", text: "Ανεβάστε το PDF του βιβλίου και του εξωφύλλου, ή το EPUB. Δεν έχετε εξώφυλλο; Φτιάξτε το με τα πρότυπά μας, με ράχη και barcode.", mock: ["interior.pdf · 104 σελ.", "cover.pdf", "✓ Έτοιμα για εκτύπωση"] },
        { title: "Ορίστε τιμή", text: "Διαλέγετε μορφές και τιμή. Βλέπετε αμέσως το κόστος εκτύπωσης και τι κερδίζετε από κάθε αντίτυπο. Ελέγχουμε το βιβλίο σε 1 με 2 εργάσιμες.", mock: ["Μαλακό εξώφυλλο", "19,90 €", "κερδίζετε {earn}"] },
        { title: "Πουλήστε", text: "Το βιβλίο μπαίνει στο βιβλιοπωλείο με δική του σελίδα. Ο αναγνώστης πληρώνει με κάρτα, Apple Pay ή Google Pay.", mock: ["Νέα παραγγελία · Θεσσαλονίκη", "Πληρώθηκε · 19,90 €"] },
        { title: "Εκτύπωση και αποστολή", text: "Κάθε αντίτυπο τυπώνεται όταν παραγγελθεί και φτάνει στον αναγνώστη σε 5 με 10 εργάσιμες. Τα ebook κατεβαίνουν αμέσως.", mock: ["Αποστολή · Αθήνα 11521", "Στον δρόμο"] },
      ],
    },
    pricing: {
      eyebrow: "Τιμές",
      title: "Πληρώνετε μόνο όταν πουλάτε",
      lede: "Η έκδοση είναι δωρεάν. Από κάθε πώληση αφαιρούνται ΦΠΑ, κόστος εκτύπωσης, χρέωση πληρωμής και η προμήθειά μας. Τα υπόλοιπα είναι δικά σας, και τα βλέπετε πριν δημοσιεύσετε.",
      example: "Παράδειγμα: μαλακό εξώφυλλο, έγχρωμο, 104 σελίδες",
      labels: { price: "Τιμή στον αναγνώστη", vat: "ΦΠΑ 6%", print: "Κόστος εκτύπωσης", fee: "Χρέωση πληρωμής", commission: "Προμήθεια Vivliothiki", total: "Κερδίζετε" },
      note: "Τα μεταφορικά τα πληρώνει ο αναγνώστης. Το κόστος εκτύπωσης εξαρτάται από μέγεθος, σελίδες και χαρτί.",
    },
    shelf: { eyebrow: "Για αναγνώστες", title: "Στο ράφι αυτή την εβδομάδα", all: "Όλα τα βιβλία →" },
    facts: [
      ["0 €", "για να εκδώσετε"],
      ["14", "κανάλια πωλήσεων"],
      ["1", "αντίτυπο αρκεί για παραγγελία"],
      ["5–10", "εργάσιμες ως την πόρτα σας"],
    ],
    trust: {
      eyebrow: "Εμπιστοσύνη",
      title: "Ασφάλεια και διαφάνεια",
      items: [
        ["Ασφαλείς πληρωμές", "Οι πληρωμές γίνονται μέσω Stripe. Δεν βλέπουμε ούτε αποθηκεύουμε στοιχεία καρτών."],
        ["Τα δικαιώματα μένουν δικά σας", "Δεν αποκτούμε κανένα δικαίωμα στο έργο σας. Αποσύρετε το βιβλίο όποτε θέλετε."],
        ["Καθαρά νούμερα", "Πριν δημοσιεύσετε βλέπετε ΦΠΑ, κόστος εκτύπωσης, προμήθεια και το δικό σας κέρδος, ανά αντίτυπο."],
        ["Υποστήριξη στα ελληνικά", "Άνθρωποι που απαντούν, συνήθως μέσα στην ίδια μέρα."],
      ],
    },
    faq: {
      eyebrow: "Συχνές ερωτήσεις",
      title: "Ό,τι ρωτάνε συνήθως οι συγγραφείς",
      items: [
        ["Πόσο κοστίζει να εκδώσω;", "Τίποτα. Δεν πληρώνετε για να ανεβάσετε ή να δημοσιεύσετε. Από κάθε πώληση κρατάμε το κόστος εκτύπωσης και μια προμήθεια, και τα υπόλοιπα είναι δικά σας."],
        ["Χρειάζομαι ISBN;", "Για το βιβλιοπωλείο μας όχι. Αν θέλετε το βιβλίο σας και σε άλλα βιβλιοπωλεία, το ISBN δίνεται δωρεάν από την Εθνική Βιβλιοθήκη της Ελλάδος."],
        ["Πόσα αντίτυπα πρέπει να παραγγείλω;", "Κανένα. Κάθε αντίτυπο τυπώνεται όταν το αγοράσει κάποιος. Αν θέλετε ποσότητα για παρουσίαση ή σχολείο, τυπώνουμε και σε ελληνικό τυπογραφείο."],
        ["Πότε πληρώνομαι;", "Κάθε μήνα, για τις πωλήσεις του προηγούμενου μήνα, με αναλυτική αναφορά ανά βιβλίο και μορφή."],
        ["Μπορώ να πουλάω και στο Amazon;", "Ναι. Το Amazon KDP δεν δέχεται βιβλία στα ελληνικά, αλλά εμείς τα καταχωρίζουμε στο Amazon από τον δικό μας λογαριασμό πωλητή, όπως και σε Public, Shopflix, eBay και ελληνικά βιβλιοπωλεία. Το ενεργοποιείτε από τη σελίδα του βιβλίου σας. Για τα marketplaces και τα βιβλιοπωλεία χρειάζεται ISBN."],
      ],
    },
  },
};

export type SiteCopy = typeof el;

const en: SiteCopy = {
  utility: { books: "My books", sales: "My sales", account: "Account", login: "Sign in" },
  soon: "soon",
  menuLabel: "Main menu",
  openMenu: "Menu",
  menu: [
    {
      label: "Solutions",
      columns: [
        {
          heading: "Who it's for",
          items: [
            { icon: "pen", title: "Authors", text: "Publish yourself, with no upfront cost and no minimum order.", href: "/dashboard" },
            { icon: "building", title: "Publishers and schools", text: "Print on demand, with no warehouse and no unsold stock.", href: "#for-whom" },
            { icon: "people", title: "Associations and councils", text: "Yearbooks, guides and event publications.", href: "#for-whom" },
          ],
        },
        {
          heading: "Selling",
          items: [
            { icon: "shop", title: "Vivliothiki bookstore", text: "Your book on our shelves, for readers across Greece.", href: "/books" },
            { icon: "globe", title: "Amazon, Skroutz, Public and more", text: "Your book on 14 sales channels, in one click.", href: "#channels" },
            { icon: "link", title: "Buy link", text: "Sell from your own site, Instagram or Facebook." },
            { icon: "stack", title: "Bulk orders", text: "Printed by a Greek printer, from 100 copies.", href: "#faq" },
          ],
        },
      ],
      features: [
        { art: "Your book on the shelf in 4 steps", tone: "forest", kicker: "Guide", text: "From your file to the reader's hands.", href: "#how" },
        { art: "Greek books on Amazon too", tone: "burgundy", kicker: "Why us", text: "KDP won't take Greek. We sell them there for you.", href: "#channels" },
      ],
    },
    {
      label: "Products",
      columns: [
        {
          heading: "Products",
          items: [
            { icon: "book", title: "Print books", text: "Paperback or hardcover, black-and-white or color, in many sizes.", href: "/books" },
            { icon: "tablet", title: "Ebooks", text: "EPUB and PDF, downloaded right after payment.", href: "/books" },
            { icon: "calendar", title: "Calendars", text: "Wall calendars with your own photos or illustrations." },
          ],
        },
        {
          heading: "Popular formats",
          links: [
            ["Novels", "/books?category=fiction"],
            ["Children's books", "/books?category=children"],
            ["Crime", "/books?category=crime"],
            ["Poetry", "/books?category=poetry"],
            ["Education", "/books?category=education"],
            ["Multilingual editions", "/books"],
          ],
        },
      ],
      features: [{ art: "From file to paper", tone: "espresso", kicker: "How it works", text: "What happens once you upload your book.", href: "#how" }],
    },
    { label: "Pricing", href: "#pricing" },
    { label: "Create", href: "/dashboard" },
    {
      label: "Guides",
      columns: [
        {
          heading: "Guides",
          items: [
            { icon: "guide", title: "Guides and templates", text: "Page sizes, margins, covers, ISBN." },
            { icon: "bulb", title: "FAQ", text: "Costs, ISBN, quantities, payouts.", href: "#faq" },
            { icon: "star", title: "Find a partner", text: "Editors, illustrators, translators, designers." },
          ],
        },
        {
          heading: "Tools",
          items: [
            { icon: "wand", title: "Cover builder", text: "Five templates, spine and barcode, ready to print.", href: "/dashboard" },
            { icon: "guide", title: "Word to PDF and EPUB", text: "Upload a .docx, get a typeset book." },
            { icon: "stack", title: "Earnings calculator", text: "See what you earn on every copy.", href: "#pricing" },
          ],
        },
      ],
      features: [{ art: "Getting an ISBN in Greece", tone: "forest", kicker: "Question", text: "Free from the National Library of Greece.", href: "#faq" }],
    },
    {
      label: "About",
      columns: [
        {
          heading: "About",
          items: [
            { icon: "heart", title: "Who we are", text: "A Greek platform for independent authors.", href: "#trust" },
            { icon: "shield", title: "Authors' rights", text: "Your rights stay yours. Leave whenever you like.", href: "#trust" },
            { icon: "mail", title: "Contact", text: "We answer in Greek and English, usually the same day.", href: "#trust" },
          ],
        },
      ],
      features: [{ art: "Every book deserves a place on the shelf", tone: "burgundy", kicker: "Our story", text: "Why we built Vivliothiki.", href: "#faq" }],
    },
    { label: "Bookstore", href: "/books" },
  ],
  home: {
    eyebrow: "Publishing for independent authors",
    title: "Publish your book.",
    titleEm: "Sell it everywhere.",
    lede: "From your Word file to the reader's hands. No publishing fee, no stock, no minimum order.",
    points: [
      "Typesetting and cover ready in minutes",
      "Paperback, hardcover and ebook",
      "Skroutz, Public, Amazon and 11 more channels",
      "We print and ship every order",
    ],
    cta: "Publish your book",
    ctaShelves: "Browse the shelves",
    glass: {
      channels: "sales channels",
      channelNames: "Skroutz · Public · Amazon · Apple Books",
      share: "You keep",
      shareText: "of what's left after VAT, printing and the payment fee",
      example: "Example: a {price} book",
      earn: "you earn per copy",
    },
    cover: { title: "Vivliothiki", line: "Your own book", chapter: "Chapter 1" },
    doors: [
      { kicker: "I'm an author", title: "Publish your book", points: ["No publishing fee, no minimum order", "Paperback, hardcover and ebook from the same files", "See your earnings before you set a price"], cta: "Start for free →", href: "/dashboard" },
      { kicker: "I'm a reader", title: "Discover independent authors", points: ["Greek books by independent authors", "Children's, crime, poetry, in many languages", "Delivery in 5–10 working days, or ebooks at once"], cta: "Browse the shelves →", href: "/books" },
    ],
    forWhom: {
      eyebrow: "Who it's for",
      title: "One platform, for anyone with a book to bring out",
      cards: [
        { title: "Authors and creators", text: "Publish in print and as an ebook, and sell in our bookstore or to your own audience. No upfront cost.", cta: "Start for free →", href: "/dashboard" },
        { title: "Publishers and schools", text: "Print on demand with no warehouse, or in quantity from a Greek printer. Yearbooks, teaching material, reissues.", cta: "See how it works →", href: "#how" },
        { title: "Associations, councils, businesses", text: "Guides, anniversary albums, event publications and gift books, in as many copies as you need.", cta: "FAQ →", href: "#faq" },
      ],
    },
    services: {
      eyebrow: "What we do",
      title: "Everything a book needs, in one place",
      items: [
        { icon: "book", title: "Publishing", text: "Paperback, hardcover and ebook from the same files, with a cover builder.", cta: "Publish your book", href: "/dashboard" },
        { icon: "shop", title: "Direct sales", text: "A bookstore with readers across Greece, and a book page you can share anywhere.", cta: "Visit the bookstore", href: "/books" },
        { icon: "truck", title: "Printing and shipping", text: "Every order is printed and sent to the reader. You never pack a thing.", cta: "See pricing", href: "#pricing" },
        { icon: "globe", title: "Every language", text: "Greek, English, German and many more. One book, many editions.", cta: "Books by language", href: "/books" },
      ],
    },
    sell: {
      title: "The easiest way to sell your book",
      text: "Every book has its own page. Share it on Instagram, Facebook or your website. Readers pay by card or Apple Pay; we print and ship.",
      cta: "Publish your book",
      mockTitle: "Papa Tony's Stories",
      mockPrice: "€19.90",
      mockBuy: "Buy",
    },
    channels: {
      eyebrow: "Sell everywhere",
      title: "One book, 14 sales channels",
      lede: "Amazon KDP won't take Greek-language books. We sell them on Amazon from our own seller account, along with Greek marketplaces, bookshops and ebook stores. You just choose where.",
      groups: [
        { title: "Promote your book page", text: "Straight away, with prices kept up to date", names: ["Skroutz", "BestPrice", "Google Shopping", "Facebook & Instagram"] },
        { title: "Marketplaces", text: "We list it for you within 3 to 7 business days", names: ["Public", "Shopflix", "Amazon", "eBay"] },
        { title: "Greek bookshops", text: "We put it forward for you, with an ISBN", names: ["Politeia", "Ianos", "Protoporia"] },
        { title: "Ebooks", text: "On phones, tablets and e-readers", names: ["Google Play Books", "Apple Books", "Kobo"] },
      ],
      cta: "Turn them on from your book's page →",
    },
    how: {
      eyebrow: "How it works",
      title: "From your file to the reader's hands",
      lede: "Upload your book, set a price, and we take care of the rest.",
      step: "Step",
      steps: [
        { title: "Upload", text: "Upload the interior and cover PDFs, or an EPUB. No cover? Make one with our templates, spine and barcode included.", mock: ["interior.pdf · 104 pp.", "cover.pdf", "✓ Ready to print"] },
        { title: "Set a price", text: "Choose formats and a price. You see the print cost and your earnings per copy right away. We review the book in 1 to 2 working days.", mock: ["Paperback", "€19.90", "you earn {earn}"] },
        { title: "Sell", text: "Your book goes into the bookstore with its own page. Readers pay by card, Apple Pay or Google Pay.", mock: ["New order · Thessaloniki", "Paid · €19.90"] },
        { title: "Printing and shipping", text: "Each copy is printed when ordered and reaches the reader in 5 to 10 working days. Ebooks download at once.", mock: ["Shipping · Athens 11521", "On its way"] },
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "You only pay when you sell",
      lede: "Publishing is free. Each sale covers VAT, printing, the payment fee and our commission. The rest is yours, and you see it before you publish.",
      example: "Example: color paperback, 104 pages",
      labels: { price: "Price to the reader", vat: "VAT 6%", print: "Printing", fee: "Payment fee", commission: "Vivliothiki commission", total: "You earn" },
      note: "Readers pay shipping. Print cost depends on trim size, page count and paper.",
    },
    shelf: { eyebrow: "For readers", title: "On the shelf this week", all: "All books →" },
    facts: [
      ["€0", "to publish"],
      ["14", "sales channels"],
      ["1", "copy is enough to order"],
      ["5–10", "working days to your door"],
    ],
    trust: {
      eyebrow: "Trust",
      title: "Safety and transparency",
      items: [
        ["Secure payments", "Payments go through Stripe. We never see or store card details."],
        ["Your rights stay yours", "We take no rights in your work. Withdraw your book whenever you like."],
        ["Clear numbers", "Before publishing you see VAT, print cost, commission and your earnings, per copy."],
        ["Support in Greek", "Real people who answer, usually the same day."],
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "What authors usually ask",
      items: [
        ["What does it cost to publish?", "Nothing. Uploading and publishing are free. Each sale covers printing and a commission, and the rest is yours."],
        ["Do I need an ISBN?", "Not for our bookstore. If you want your book in other shops too, the National Library of Greece issues ISBNs for free."],
        ["How many copies must I order?", "None. Each copy is printed when someone buys it. For a launch or a school, we also print in quantity with a Greek printer."],
        ["When do I get paid?", "Monthly, for the previous month's sales, with a report per book and format."],
        ["Can I sell on Amazon too?", "Yes. Amazon KDP doesn't accept Greek-language books, but we list them on Amazon from our own seller account, and on Public, Shopflix, eBay and Greek bookshops too. Turn it on from your book's page. Marketplaces and bookshops need an ISBN."],
      ],
    },
  },
};

export const siteCopy = (lang: Locale): SiteCopy => (lang === "el" ? el : en);
