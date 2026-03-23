/**
 * Sentence Completion Generator (השלמת משפטים)
 * Generates fill-in-the-blank sentences with multiple-choice options.
 * Uses template sentences with blanks and curated word banks.
 */

import {
  GeneratedQuestion,
  makeOptions,
  pick,
  shuffle,
  randInt,
} from "./utils.js";

// ── Sentence templates ──
// Each template has a sentence with ___ and the correct word + distractors

interface SentenceTemplate {
  sentence: string;
  correct: string;
  distractors: string[];
  difficulty: number;
  explanation: string;
}

// Grouped by difficulty
const TEMPLATES: SentenceTemplate[] = [
  // ── Difficulty 1-2: Easy ──
  {
    sentence: "הילד ___ את הספר מהמדף",
    correct: "לקח",
    distractors: ["אכל", "שמע", "שבר"],
    difficulty: 1,
    explanation: 'לוקחים ספר מהמדף - הפועל "לקח" מתאים לפעולה של הורדת חפץ ממקום',
  },
  {
    sentence: "הציפור ___ על ענף העץ",
    correct: "ישבה",
    distractors: ["שחתה", "חפרה", "רצה"],
    difficulty: 1,
    explanation: "ציפורים יושבות על ענפים",
  },
  {
    sentence: "כשיורד גשם, אנחנו לובשים ___",
    correct: "מעיל גשם",
    distractors: ["בגד ים", "כובע שמש", "סנדלים"],
    difficulty: 1,
    explanation: "מעיל גשם מגן עלינו מהגשם",
  },
  {
    sentence: "השמש זורחת ב___ ושוקעת ב___",
    correct: "מזרח, מערב",
    distractors: ["צפון, דרום", "מערב, מזרח", "דרום, צפון"],
    difficulty: 1,
    explanation: "השמש זורחת במזרח ושוקעת במערב",
  },
  {
    sentence: "כדי לראות בחושך, אנחנו צריכים ___",
    correct: "פנס",
    distractors: ["כובע", "כפפות", "משקפי שמש"],
    difficulty: 1,
    explanation: "פנס מאיר בחושך ומאפשר לנו לראות",
  },
  {
    sentence: "הכלב ___ בשמחה כשראה את בעליו",
    correct: "כישכש בזנבו",
    distractors: ["טס באוויר", "צלל למים", "טיפס על עץ"],
    difficulty: 1,
    explanation: "כלבים מכשכשים בזנב כשהם שמחים",
  },
  {
    sentence: "בחורף, הטמפרטורה ___",
    correct: "יורדת",
    distractors: ["עולה", "נשארת אותו דבר", "מתחממת"],
    difficulty: 1,
    explanation: "בחורף הטמפרטורה יורדת וקר בחוץ",
  },
  {
    sentence: "אנחנו שותים מים כשאנחנו ___",
    correct: "צמאים",
    distractors: ["עייפים", "שמחים", "כועסים"],
    difficulty: 1,
    explanation: "שותים מים כדי להרוות צמא",
  },
  {
    sentence: "הילדה ___ תמונה יפה בצבעים",
    correct: "ציירה",
    distractors: ["בישלה", "תפרה", "שתלה"],
    difficulty: 1,
    explanation: 'מציירים תמונה בצבעים - הפועל "ציירה" מתאר יצירה של תמונה',
  },
  {
    sentence: "הדג חי ב___",
    correct: "מים",
    distractors: ["אוויר", "אדמה", "אש"],
    difficulty: 1,
    explanation: "דגים חיים במים",
  },

  // ── Difficulty 2-3: Medium ──
  {
    sentence: "למרות שירד גשם חזק, הוא ___ לא לקחת מטרייה",
    correct: "החליט",
    distractors: ["שכח", "פחד", "ביקש"],
    difficulty: 2,
    explanation: '"החליט" מתאר בחירה מודעת שלא ללקוח מטרייה למרות הגשם',
  },
  {
    sentence: "התלמיד הצטיין במבחן כי הוא ___ היטב",
    correct: "התכונן",
    distractors: ["ישן", "שיחק", "אכל"],
    difficulty: 2,
    explanation: "הצלחה במבחן היא תוצאה של הכנה טובה",
  },
  {
    sentence: "הספר הזה מאוד ___, לא יכולתי להפסיק לקרוא",
    correct: "מרתק",
    distractors: ["משעמם", "כבד", "ישן"],
    difficulty: 2,
    explanation: 'ספר שלא ניתן להפסיק לקרוא הוא "מרתק"',
  },
  {
    sentence: "האמן ___ פסל יפה מגוש חימר",
    correct: "פיסל",
    distractors: ["בנה", "גילה", "מצא"],
    difficulty: 2,
    explanation: 'יצירת פסל מחימר נקראת "פיסול"',
  },
  {
    sentence: "כדי ___ את הבעיה, צריך לחשוב בצורה יצירתית",
    correct: "לפתור",
    distractors: ["ליצור", "לגלות", "להמציא"],
    difficulty: 2,
    explanation: '"לפתור" היא הפעולה המתאימה כשמדובר בבעיה',
  },
  {
    sentence: "המדען ___ ניסוי חדש במעבדה",
    correct: "ערך",
    distractors: ["קרא", "שמע", "שר"],
    difficulty: 2,
    explanation: '"ערך ניסוי" - הצירוף הנכון לביצוע ניסוי מדעי',
  },
  {
    sentence: "הגנן ___ פרחים חדשים בגינה",
    correct: "שתל",
    distractors: ["בישל", "צייר", "כתב"],
    difficulty: 2,
    explanation: "גננים שותלים פרחים בגינה",
  },
  {
    sentence: "הנהר ___ מההר אל הים",
    correct: "זורם",
    distractors: ["טס", "קופץ", "רוקד"],
    difficulty: 2,
    explanation: "מים בנהר זורמים מההר אל הים",
  },
  {
    sentence: "האישה ___ את התינוק בזרועותיה בעדינות",
    correct: "חיבקה",
    distractors: ["זרקה", "דחפה", "הרחיקה"],
    difficulty: 2,
    explanation: 'חיבוק בעדינות הוא הפעולה ההגיונית עם תינוק - "חיבקה"',
  },
  {
    sentence: "לאחר ___ ארוכה, הם הגיעו סוף סוף ליעד",
    correct: "נסיעה",
    distractors: ["ארוחה", "שינה", "הפסקה"],
    difficulty: 2,
    explanation: "הגעה ליעד היא תוצאה של נסיעה",
  },

  // ── Difficulty 3-4: Hard ──
  {
    sentence: "ההמצאה הזו ___ את עולם התקשורת לחלוטין",
    correct: "שינתה",
    distractors: ["שמרה", "העתיקה", "מחקה"],
    difficulty: 3,
    explanation: 'המצאה שמשנה עולם "שינתה" אותו - השפיעה עליו מאוד',
  },
  {
    sentence: "הוא ___ בדעתו למרות כל הלחצים מסביב",
    correct: "עמד",
    distractors: ["ישב", "רץ", "הלך"],
    difficulty: 3,
    explanation: '"עמד בדעתו" = התעקש על עמדתו, לא שינה את דעתו',
  },
  {
    sentence: "הידיעה המפתיעה ___ גלים בכל הארץ",
    correct: "עוררה",
    distractors: ["שתלה", "בישלה", "ציירה"],
    difficulty: 3,
    explanation: '"עוררה גלים" = גרמה לתגובות רבות - ביטוי מושאל',
  },
  {
    sentence: "הפרויקט ___ תקציב של מיליוני שקלים",
    correct: "דרש",
    distractors: ["שתל", "אכל", "שמע"],
    difficulty: 3,
    explanation: '"דרש" = הצריך - פרויקט דורש (מצריך) תקציב',
  },
  {
    sentence: "המנהיג ___ נאום מרגש בפני הקהל",
    correct: "נשא",
    distractors: ["שתל", "חפר", "בישל"],
    difficulty: 3,
    explanation: '"נשא נאום" - הצירוף הנכון לאמירת נאום',
  },
  {
    sentence: "ככל שהזמן חלף, הזיכרון הלך ו___",
    correct: "דהה",
    distractors: ["גדל", "צמח", "הבשיל"],
    difficulty: 3,
    explanation: 'זיכרונות "דוהים" (נחלשים) עם הזמן',
  },
  {
    sentence: "השופט ___ את פסק הדין לאחר דיון ארוך",
    correct: "הכריע",
    distractors: ["שר", "רקד", "צייר"],
    difficulty: 3,
    explanation: '"הכריע" = קיבל החלטה סופית - שופט מכריע בדין',
  },
  {
    sentence: "התגלית ___ אור חדש על תקופה עתיקה",
    correct: "שפכה",
    distractors: ["בנתה", "שתלה", "ציירה"],
    difficulty: 3,
    explanation: '"שפכה אור" = חשפה מידע חדש - ביטוי מושאל',
  },
  {
    sentence: "העובד ___ את המשימה בהצלחה רבה",
    correct: "השלים",
    distractors: ["שבר", "מחק", "הפסיד"],
    difficulty: 3,
    explanation: '"השלים" = סיים בהצלחה - ביצוע מוצלח של משימה',
  },
  {
    sentence: "לפני קבלת החלטה חשובה, כדאי ___ את כל האפשרויות",
    correct: "לשקול",
    distractors: ["לזרוק", "לשבור", "למחוק"],
    difficulty: 3,
    explanation: '"לשקול" = לבחון ולהעריך - חשיבה מעמיקה לפני החלטה',
  },

  // ── Difficulty 4-5: Very hard ──
  {
    sentence: "דבריו ___ תהודה רבה בציבור",
    correct: "עוררו",
    distractors: ["שתלו", "אפו", "תפרו"],
    difficulty: 4,
    explanation: '"עוררו תהודה" = גרמו לתגובה ציבורית רחבה',
  },
  {
    sentence: "המחקר ___ לאור ממצאים חדשים ומפתיעים",
    correct: "הוביל",
    distractors: ["רקד", "שר", "ישן"],
    difficulty: 4,
    explanation: '"הוביל לאור" = גרם לגילוי - המחקר הביא לתוצאות חדשות',
  },
  {
    sentence: "היצירה ___ השראה מהטבע הסובב",
    correct: "שאבה",
    distractors: ["שברה", "מחקה", "הפסידה"],
    difficulty: 4,
    explanation: '"שאבה השראה" = קיבלה רעיונות מ... - ביטוי יצירתי',
  },
  {
    sentence: "הסופר ___ את המילים בקפידה רבה",
    correct: "בחר",
    distractors: ["זרק", "אכל", "שבר"],
    difficulty: 4,
    explanation: "סופרים בוחרים מילים בקפידה כדי לכתוב טקסט איכותי",
  },
  {
    sentence: "העדויות ___ תמונה מורכבת של האירוע",
    correct: "צירפו",
    distractors: ["שברו", "מחקו", "איבדו"],
    difficulty: 4,
    explanation: '"צירפו תמונה" = יצרו יחד תמונה שלמה מחלקים שונים',
  },
  {
    sentence: "ההצעה ___ על אוזניים קשובות",
    correct: "נפלה",
    distractors: ["ישבה", "רצה", "טסה"],
    difficulty: 4,
    explanation: '"נפלה על אוזניים קשובות" = התקבלה ברצון ופתיחות',
  },
  {
    sentence: "התרבות הזו ___ שורשים עמוקים בהיסטוריה",
    correct: "הכתה",
    distractors: ["שברה", "מחקה", "איבדה"],
    difficulty: 4,
    explanation: '"הכתה שורשים" = התבססה באופן עמוק ויציב',
  },
  {
    sentence: "הנסיבות ___ לשינוי מדיניות",
    correct: "חייבו",
    distractors: ["ציירו", "שרו", "רקדו"],
    difficulty: 5,
    explanation: '"חייבו" = הכריחו, הצריכו - הנסיבות הצריכו שינוי',
  },
  {
    sentence: "היוזמה ___ פירות לאחר שנים של עבודה",
    correct: "נשאה",
    distractors: ["שברה", "מחקה", "הפסידה"],
    difficulty: 5,
    explanation: '"נשאה פירות" = הצליחה, הביאה תוצאות - ביטוי מושאל',
  },
  {
    sentence: "החוקר ___ את הנתונים בזהירות לפני שפרסם את מסקנותיו",
    correct: "ניתח",
    distractors: ["זרק", "שבר", "אכל"],
    difficulty: 5,
    explanation: '"ניתח" = בחן לעומק - חוקר מנתח נתונים לפני הסקת מסקנות',
  },
  // ── Additional Easy (difficulty 1) ──
  {
    sentence: "אנחנו אוכלים ארוחת בוקר ב___",
    correct: "בוקר",
    distractors: ["לילה", "צהריים", "ערב"],
    difficulty: 1,
    explanation: "ארוחת בוקר נאכלת בבוקר",
  },
  {
    sentence: "הכדור ___ מהמדרגות",
    correct: "התגלגל",
    distractors: ["טס", "שר", "גדל"],
    difficulty: 1,
    explanation: "כדור מתגלגל כשהוא זז במורד המדרגות",
  },
  {
    sentence: "בלילה אפשר לראות ב___ כוכבים",
    correct: "שמיים",
    distractors: ["אדמה", "מים", "בית"],
    difficulty: 1,
    explanation: "כוכבים נראים בשמיים בלילה",
  },
  {
    sentence: "כדי לכתוב, אנחנו צריכים ___ ומחברת",
    correct: "עיפרון",
    distractors: ["כפית", "מזלג", "מפתח"],
    difficulty: 1,
    explanation: "כותבים בעיפרון (או בעט) על מחברת",
  },
  {
    sentence: "החתול ___ אחרי העכבר",
    correct: "רדף",
    distractors: ["עף", "שחה", "שתל"],
    difficulty: 1,
    explanation: "חתולים רודפים אחרי עכברים",
  },
  {
    sentence: "כשקר בחוץ אנחנו לובשים ___",
    correct: "סוודר",
    distractors: ["בגד ים", "כפכפים", "משקפי שמש"],
    difficulty: 1,
    explanation: "סוודר מחמם אותנו כשקר",
  },
  {
    sentence: "התינוק ___ כל הלילה",
    correct: "בכה",
    distractors: ["רקד", "שר", "רץ"],
    difficulty: 1,
    explanation: "תינוקות בוכים כשמשהו מפריע להם",
  },
  {
    sentence: "הנמלים ___ אוכל לקן שלהן",
    correct: "סחבו",
    distractors: ["ציירו", "שרו", "קראו"],
    difficulty: 1,
    explanation: "נמלים סוחבות אוכל חזרה לקן",
  },
  {
    sentence: "הילדה ___ חבל בהפסקה",
    correct: "קפצה",
    distractors: ["בישלה", "תפרה", "חרשה"],
    difficulty: 1,
    explanation: "ילדים קופצים חבל בהפסקה",
  },
  {
    sentence: "אנחנו ___ ידיים לפני ארוחה",
    correct: "שוטפים",
    distractors: ["מציירים", "חותכים", "משחקים"],
    difficulty: 1,
    explanation: "שוטפים ידיים לפני אוכל כדי לשמור על היגיינה",
  },
  {
    sentence: "הכלב ___ את העצם בגינה",
    correct: "קבר",
    distractors: ["צייר", "קרא", "בישל"],
    difficulty: 1,
    explanation: "כלבים קוברים עצמות באדמה",
  },
  {
    sentence: "בקיץ אנחנו הולכים ל___ כדי לשחות",
    correct: "ים",
    distractors: ["הר", "מדבר", "יער"],
    difficulty: 1,
    explanation: "שוחים בים בקיץ",
  },
  // ── Additional Medium (difficulty 2) ──
  {
    sentence: "הזמרת ___ שיר יפה על הבמה",
    correct: "שרה",
    distractors: ["ציירה", "בישלה", "תפרה"],
    difficulty: 2,
    explanation: "זמרים שרים שירים על הבמה",
  },
  {
    sentence: "הים היה ___ מאוד והגלים היו גבוהים",
    correct: "סוער",
    distractors: ["שקט", "יבש", "חשוך"],
    difficulty: 2,
    explanation: "ים סוער = ים עם גלים גבוהים ורוחות חזקות",
  },
  {
    sentence: "הילד ___ את אופניו לפני שיצא לדרך",
    correct: "בדק",
    distractors: ["בישל", "שתל", "שר"],
    difficulty: 2,
    explanation: "בודקים את האופניים לפני נסיעה כדי לוודא שהם תקינים",
  },
  {
    sentence: "המשפחה ___ איחולים לסבתא ליום הולדתה",
    correct: "שלחה",
    distractors: ["חפרה", "ציידה", "שברה"],
    difficulty: 2,
    explanation: "שולחים איחולים = מברכים מישהו",
  },
  {
    sentence: "כלי הנגינה ___ צלילים נעימים",
    correct: "הפיק",
    distractors: ["אכל", "ישן", "חפר"],
    difficulty: 2,
    explanation: "כלי נגינה מפיקים (מוציאים) צלילים",
  },
  {
    sentence: "הארנב ___ במהירות מהשועל",
    correct: "ברח",
    distractors: ["שוחח", "סעד", "התלבש"],
    difficulty: 2,
    explanation: "ארנבים בורחים מטורפים כמו שועלים",
  },
  {
    sentence: "השכנים ___ יחד את החצר המשותפת",
    correct: "ניקו",
    distractors: ["שברו", "שרפו", "מכרו"],
    difficulty: 2,
    explanation: "שכנים מנקים יחד שטחים משותפים",
  },
  {
    sentence: "היא ___ סיפור מרתק לפני השינה",
    correct: "קראה",
    distractors: ["בישלה", "תפרה", "חרשה"],
    difficulty: 2,
    explanation: "קוראים סיפור לפני השינה",
  },
  {
    sentence: "הילדים ___ מגדל גבוה מקוביות",
    correct: "בנו",
    distractors: ["אכלו", "שרו", "שתו"],
    difficulty: 2,
    explanation: "בונים מגדל מקוביות",
  },
  {
    sentence: "הצב נע ___ מאוד לעומת הארנב",
    correct: "לאט",
    distractors: ["מהר", "גבוה", "חזק"],
    difficulty: 2,
    explanation: "צבים ידועים בכך שהם נעים לאט",
  },
  {
    sentence: "המורה ___ על הלוח את התרגילים",
    correct: "כתבה",
    distractors: ["שתלה", "אפתה", "תפרה"],
    difficulty: 2,
    explanation: "מורים כותבים על הלוח",
  },
  {
    sentence: "הדבש ___ מאוד לטעם",
    correct: "מתוק",
    distractors: ["מר", "חמוץ", "מלוח"],
    difficulty: 2,
    explanation: "דבש הוא מתוק",
  },
  // ── Additional Hard (difficulty 3) ──
  {
    sentence: "האתגר ___ ממנו מאמץ רב ומסירות",
    correct: "דרש",
    distractors: ["שר", "רקד", "ישן"],
    difficulty: 3,
    explanation: '"דרש" = הצריך - אתגר דורש מאמץ',
  },
  {
    sentence: "הוא ___ הזדמנות שלא חוזרת על עצמה",
    correct: "פספס",
    distractors: ["בנה", "שתל", "שר"],
    difficulty: 3,
    explanation: '"פספס" = החמיץ - לא ניצל את ההזדמנות',
  },
  {
    sentence: "התנאים הקשים ___ לו להתמודד",
    correct: "אילצו",
    distractors: ["שרו", "ציירו", "רקדו"],
    difficulty: 3,
    explanation: '"אילצו" = הכריחו - התנאים הכריחו אותו להתמודד',
  },
  {
    sentence: "ההסכם ___ את היחסים בין שתי המדינות",
    correct: "חיזק",
    distractors: ["שבר", "מחק", "שכח"],
    difficulty: 3,
    explanation: '"חיזק" = עשה חזקים יותר - ההסכם שיפר את היחסים',
  },
  {
    sentence: "הרעיון המקורי ___ עניין רב בקרב המאזינים",
    correct: "עורר",
    distractors: ["כיבה", "שבר", "מחק"],
    difficulty: 3,
    explanation: '"עורר עניין" = גרם לאנשים להתעניין',
  },
  {
    sentence: "הוא ___ את מבטו מהחלון אל הספר",
    correct: "הסיט",
    distractors: ["שתל", "בישל", "רקד"],
    difficulty: 3,
    explanation: '"הסיט" = העביר - העביר את המבט ממקום למקום',
  },
  {
    sentence: "הכתבה ___ דיון ער בכיתה",
    correct: "הצמיחה",
    distractors: ["שברה", "מחקה", "שרפה"],
    difficulty: 3,
    explanation: '"הצמיחה דיון" = גרמה לדיון להתפתח',
  },
  {
    sentence: "השחקן ___ את הקהל בהופעה מרשימה",
    correct: "ריתק",
    distractors: ["הרגיע", "הרדים", "משעמם"],
    difficulty: 3,
    explanation: '"ריתק" = גרם לקהל לא להסיר עיניים - הופעה מרשימה',
  },
  {
    sentence: "הוא ___ במשיכות מכחול עדינות את הנוף",
    correct: "תיאר",
    distractors: ["אפה", "תפר", "חרש"],
    difficulty: 3,
    explanation: '"תיאר" = ציייר, שרטט - תיאור נוף בציור',
  },
  {
    sentence: "ההחלטה ___ בידי הנהלת בית הספר",
    correct: "נתונה",
    distractors: ["קופצת", "רצה", "שרה"],
    difficulty: 3,
    explanation: '"נתונה בידי" = נמצאת באחריות של - ההנהלה מחליטה',
  },
  // ── Additional Very Hard (difficulty 4-5) ──
  {
    sentence: "המשבר ___ צל כבד על ההישגים הקודמים",
    correct: "הטיל",
    distractors: ["שתל", "צייר", "אפה"],
    difficulty: 4,
    explanation: '"הטיל צל" = פגע, גרם לערעור - ביטוי מושאל',
  },
  {
    sentence: "המנהיג ___ את אנשיו בכוח אישיותו",
    correct: "הניע",
    distractors: ["הרדים", "משעמם", "שבר"],
    difficulty: 4,
    explanation: '"הניע" = עודד לפעולה - מנהיג מניע אנשים',
  },
  {
    sentence: "הוויכוח ___ לעבר סוגיות חדשות",
    correct: "נסחף",
    distractors: ["נרדם", "שבר", "שתל"],
    difficulty: 4,
    explanation: '"נסחף" = עבר, גלש - הוויכוח התפתח לכיוון אחר',
  },
  {
    sentence: "התופעה ___ מענה לשאלות רבות",
    correct: "סיפקה",
    distractors: ["שברה", "מחקה", "שרפה"],
    difficulty: 4,
    explanation: '"סיפקה מענה" = נתנה תשובה - התופעה הסבירה דברים',
  },
  {
    sentence: "המילים שלו ___ תהודה עמוקה בלבבות השומעים",
    correct: "מצאו",
    distractors: ["שרו", "רקדו", "ישנו"],
    difficulty: 5,
    explanation: '"מצאו תהודה" = נגעו ללב - ביטוי לדברים שהשפיעו',
  },
  {
    sentence: "האמת ___ את דרכה החוצה לאחר שנים",
    correct: "פילסה",
    distractors: ["רקדה", "שרה", "ציירה"],
    difficulty: 5,
    explanation: '"פילסה את דרכה" = מצאה דרך - האמת התגלתה בסופו של דבר',
  },
  {
    sentence: "המחאה ___ גלי הדף ברחבי הארץ",
    correct: "עוררה",
    distractors: ["ישנה", "שברה", "מחקה"],
    difficulty: 5,
    explanation: '"עוררה גלי הדף" = גרמה לתגובה ציבורית חזקה',
  },
  {
    sentence: "הנאום הארוך ___ את סבלנות הקהל",
    correct: "מיצה",
    distractors: ["חיזק", "הגדיל", "שיפר"],
    difficulty: 5,
    explanation: '"מיצה" = כילה, הפך ללא סבלנות - ביטוי לדבר שנמאס',
  },
];

// ── Proverb/idiom completion ──
const IDIOM_TEMPLATES: SentenceTemplate[] = [
  {
    sentence: 'מי ששותק - ___',
    correct: "מסכים",
    distractors: ["כועס", "שמח", "ישן"],
    difficulty: 3,
    explanation: '"שתיקה כהסכמה" - פתגם ידוע',
  },
  {
    sentence: 'כל ההתחלות ___',
    correct: "קשות",
    distractors: ["ירוקות", "ארוכות", "שקטות"],
    difficulty: 2,
    explanation: '"כל ההתחלות קשות" - פתגם על קשיי ההתחלה',
  },
  {
    sentence: "אין חדש תחת ___",
    correct: "השמש",
    distractors: ["הגשר", "המיטה", "הכיסא"],
    difficulty: 2,
    explanation: '"אין חדש תחת השמש" - מקור בספר קהלת',
  },
  {
    sentence: 'טוב ציפור אחת ביד מאשר ___ על העץ',
    correct: "עשר",
    distractors: ["שתיים", "מאה", "אלף"],
    difficulty: 2,
    explanation: '"טוב ציפור אחת ביד מאשר עשר על העץ" - עדיף דבר בטוח',
  },
  {
    sentence: "לא הכל זהב מה ש___",
    correct: "נוצץ",
    distractors: ["גדול", "יקר", "חדש"],
    difficulty: 2,
    explanation: '"לא הכל זהב מה שנוצץ" - לא תמיד המראה מעיד על האיכות',
  },
  {
    sentence: "על טעם ___ אין להתווכח",
    correct: "וריח",
    distractors: ["וצבע", "וקול", "ומגע"],
    difficulty: 3,
    explanation: '"על טעם וריח אין להתווכח" - כל אדם והעדפותיו',
  },
  {
    sentence: "הנה ניתנה לו ___ בה",
    correct: "יד",
    distractors: ["רגל", "אוזן", "אצבע"],
    difficulty: 3,
    explanation: '"יד" - ביטוי שמשמעותו עזרה',
  },
  {
    sentence: "מי שלא ___ - לא מרוויח",
    correct: "מסתכן",
    distractors: ["ישן", "אוכל", "שותק"],
    difficulty: 3,
    explanation: '"מי שלא מסתכן - לא מרוויח" - צריך לקחת סיכונים כדי להצליח',
  },
  {
    sentence: "המילה הטובה ביותר היא זו שלא ___",
    correct: "נאמרה",
    distractors: ["נכתבה", "נשמעה", "נמחקה"],
    difficulty: 4,
    explanation: "הביטוי מציע שלעתים עדיף לשתוק מאשר לדבר",
  },
  {
    sentence: "דרך ארוכה מתחילה ב___",
    correct: "צעד אחד",
    distractors: ["גשם חזק", "שעון גדול", "ספר עבה"],
    difficulty: 2,
    explanation: '"דרך ארוכה מתחילה בצעד אחד" - פתגם סיני על התחלה',
  },
  // ── Additional Idioms ──
  {
    sentence: "אל תדחה למחר מה שאפשר לעשות ___",
    correct: "היום",
    distractors: ["מחרתיים", "בשבוע הבא", "בחודש הבא"],
    difficulty: 2,
    explanation: "פתגם ידוע - עדיף לעשות דברים מיד ולא לדחות",
  },
  {
    sentence: "התפוח לא נופל רחוק מ___",
    correct: "העץ",
    distractors: ["הבית", "הגדר", "הנהר"],
    difficulty: 2,
    explanation: '"התפוח לא נופל רחוק מהעץ" - ילדים דומים להוריהם',
  },
  {
    sentence: "עין ___ עין, שן תחת שן",
    correct: "תחת",
    distractors: ["מעל", "ליד", "מאחורי"],
    difficulty: 2,
    explanation: '"עין תחת עין" - מקור במקרא, עונש מידתי',
  },
  {
    sentence: "אחרי הגשם בא ___",
    correct: "השמש",
    distractors: ["הרוח", "השלג", "הלילה"],
    difficulty: 1,
    explanation: "פתגם - אחרי קשיים באים ימים טובים",
  },
  {
    sentence: "מה ששנוא עליך ___ לחברך",
    correct: "אל תעשה",
    distractors: ["תעשה", "תספר", "תחשוב"],
    difficulty: 3,
    explanation: "כלל הזהב של הלל הזקן",
  },
  {
    sentence: "הפה ___ אבל הלב לא חש",
    correct: "ממלל",
    distractors: ["שותק", "צועק", "לוחש"],
    difficulty: 4,
    explanation: '"הפה ממלל" = מדבר מבלי לחוש באמת',
  },
  {
    sentence: "אל תסתכל בקנקן אלא ב___",
    correct: "מה שיש בו",
    distractors: ["צבע שלו", "גודל שלו", "מחיר שלו"],
    difficulty: 3,
    explanation: "אל תשפוט לפי מראה חיצוני - מה שבפנים חשוב יותר",
  },
  {
    sentence: "איזהו חכם? ה___ מכל אדם",
    correct: "לומד",
    distractors: ["בורח", "ישן", "אוכל"],
    difficulty: 3,
    explanation: '"איזהו חכם? הלומד מכל אדם" - ממשנת אבות',
  },
  {
    sentence: "הרבה ___ יש לגמל, ולכן הוא דבשת",
    correct: "קנאה",
    distractors: ["שמחה", "עצב", "אהבה"],
    difficulty: 4,
    explanation: "ביטוי עממי - קנאה כגורם לדברים שליליים",
  },
  {
    sentence: "כל מקום שאתה הולך אליו, ___ שם לפניך",
    correct: "רגליך מוליכות אותך",
    distractors: ["ידיך מגיעות", "עיניך רואות", "אוזניך שומעות"],
    difficulty: 4,
    explanation: "פתגם עברי - אתה מגיע למקום שאתה שואף אליו",
  },
];

// ── Logical connector templates ──
const CONNECTOR_TEMPLATES: SentenceTemplate[] = [
  {
    sentence: '___ ירד גשם, נשארנו בבית',
    correct: "מכיוון ש",
    distractors: ["למרות ש", "בזמן ש", "עד ש"],
    difficulty: 3,
    explanation: '"מכיוון ש" - מילת סיבה: הגשם הוא הסיבה להישארות בבית',
  },
  {
    sentence: "הוא הצליח במבחן ___ לא למד מספיק",
    correct: "למרות ש",
    distractors: ["כי", "בגלל ש", "מכיוון ש"],
    difficulty: 3,
    explanation: '"למרות ש" - מילת ניגוד: ההצלחה היא בניגוד לציפייה',
  },
  {
    sentence: "נלך לטיול ___ מזג האוויר יהיה נאה",
    correct: "אם",
    distractors: ["כי", "למרות ש", "בגלל ש"],
    difficulty: 2,
    explanation: '"אם" - מילת תנאי: הטיול מותנה במזג האוויר',
  },
  {
    sentence: "היא אוהבת לקרוא, ___ אחיה מעדיף לשחק כדורגל",
    correct: "ואילו",
    distractors: ["ולכן", "כי", "בגלל"],
    difficulty: 3,
    explanation: '"ואילו" - מילת ניגוד המשווה בין שני דברים שונים',
  },
  {
    sentence: "הוא ישן מאוחר, ___ היה עייף בבוקר",
    correct: "לכן",
    distractors: ["למרות ש", "כדי ש", "בזמן ש"],
    difficulty: 2,
    explanation: '"לכן" - מילת מסקנה: השינה המאוחרת גרמה לעייפות',
  },
  {
    sentence: "היא התאמנה קשה ___ תוכל לנצח בתחרות",
    correct: "כדי ש",
    distractors: ["למרות ש", "מכיוון ש", "בגלל ש"],
    difficulty: 3,
    explanation: '"כדי ש" - מילת מטרה: האימון היה לצורך הניצחון',
  },
  {
    sentence: "הוא הבטיח לבוא, ___ בסוף לא הגיע",
    correct: "אבל",
    distractors: ["ולכן", "כי", "בגלל"],
    difficulty: 2,
    explanation: '"אבל" - מילת ניגוד: ההבטחה לא קוימה',
  },
  {
    sentence: "___ שתתאמץ יותר, כך התוצאות יהיו טובות יותר",
    correct: "ככל",
    distractors: ["למרות", "בגלל", "כדי"],
    difficulty: 4,
    explanation: '"ככל...כך" - מבנה של יחס ישר: מאמץ רב = תוצאות טובות',
  },
  // ── Additional Connectors ──
  {
    sentence: "הוא עייף מאוד, ___ הוא עדיין ממשיך לעבוד",
    correct: "ובכל זאת",
    distractors: ["ולכן", "כי", "בגלל"],
    difficulty: 3,
    explanation: '"ובכל זאת" = למרות הכל - ניגוד בין עייפות לעבודה',
  },
  {
    sentence: "___ הגיע החורף, הימים התקצרו",
    correct: "כאשר",
    distractors: ["למרות ש", "כדי ש", "עד ש"],
    difficulty: 2,
    explanation: '"כאשר" = בזמן ש - תיאור מה שקרה כשהגיע החורף',
  },
  {
    sentence: "השמש שקעה, ___ החושך כיסה את הארץ",
    correct: "ולפיכך",
    distractors: ["למרות ש", "כדי ש", "בזמן ש"],
    difficulty: 4,
    explanation: '"ולפיכך" = ולכן - מילת מסקנה פורמלית',
  },
  {
    sentence: "נצא לטיול ___ נסיים את שיעורי הבית",
    correct: "אחרי ש",
    distractors: ["למרות ש", "כדי ש", "בגלל ש"],
    difficulty: 2,
    explanation: '"אחרי ש" = לאחר - סדר כרונולוגי: קודם שיעורים, אחר כך טיול',
  },
  {
    sentence: "הוא נשאר בבית ___ חש לא טוב",
    correct: "משום ש",
    distractors: ["למרות ש", "כדי ש", "אף על פי ש"],
    difficulty: 3,
    explanation: '"משום ש" = כי, בגלל - הרגשה לא טובה היא הסיבה',
  },
  {
    sentence: "היא רצתה לנוח, ___ הסכימה להישאר",
    correct: "אך",
    distractors: ["ולכן", "כי", "בגלל"],
    difficulty: 3,
    explanation: '"אך" = אבל - ניגוד: רצתה לנוח אבל נשארה',
  },
  {
    sentence: "סיים ___ את המשימה ___ תוכל לצאת לשחק",
    correct: "תחילה, ואז",
    distractors: ["למרות ש, כי", "בגלל, אם", "כדי ש, אבל"],
    difficulty: 3,
    explanation: '"תחילה...ואז" = קודם דבר אחד, אחר כך השני',
  },
  {
    sentence: "היא מעדיפה לקרוא, ___ אחותה מעדיפה לצייר",
    correct: "בעוד ש",
    distractors: ["ולכן", "כי", "בגלל ש"],
    difficulty: 3,
    explanation: '"בעוד ש" = בזמן ש / לעומת - השוואה בין העדפות שונות',
  },
];

// ── Generator functions ──

function generateFromTemplate(difficulty: number): GeneratedQuestion {
  // Combine all templates and filter by difficulty
  const allTemplates = [...TEMPLATES, ...IDIOM_TEMPLATES, ...CONNECTOR_TEMPLATES];
  const suitable = allTemplates.filter(
    (t) => Math.abs(t.difficulty - difficulty) <= 1
  );
  const template = pick(suitable.length > 0 ? suitable : allTemplates);

  const questionText = `השלימו את המשפט:\n${template.sentence}`;

  const allOptions = shuffle([template.correct, ...template.distractors]);
  const correctIndex = allOptions.indexOf(template.correct);

  const { options, correctAnswer } = makeOptions(allOptions, correctIndex);

  return {
    category: "sentence_completion",
    difficulty: template.difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: template.explanation,
    tags: "sentence_completion,השלמת_משפט",
    timeLimitSec: difficulty <= 2 ? 45 : 60,
  };
}

// ── Dynamic vocabulary-based generation ──

interface VocabGroup {
  context: string; // sentence context
  slot: string; // slot category
  correct: string;
  distractors: string[];
}

const VOCAB_CONTEXTS: VocabGroup[] = [
  { context: "החקלאי ___ את השדה לפני הזריעה", slot: "verb", correct: "חרש", distractors: ["צבע", "שר", "קרא"] },
  { context: "הדייג ___ רשת גדולה לתוך הים", slot: "verb", correct: "השליך", distractors: ["בישל", "תפר", "צייר"] },
  { context: "הצייר ___ צבעים על הבד", slot: "verb", correct: "מרח", distractors: ["חפר", "זרע", "עף"] },
  { context: "הגשם הכבד גרם ל___ ברחובות", slot: "noun", correct: "הצפה", distractors: ["שריפה", "יובש", "חורב"] },
  { context: "הרופא רשם לחולה ___ נגד השיעול", slot: "noun", correct: "תרופה", distractors: ["מתכון", "שיר", "ציור"] },
  { context: "הספורטאי ___ את השיא הקודם", slot: "verb", correct: "שבר", distractors: ["שמר", "שכח", "שמע"] },
  { context: "המורה ___ את התלמידים על עבודתם", slot: "verb", correct: "שיבחה", distractors: ["הענישה", "שלחה", "שכחה"] },
  { context: "העננים ___ את השמיים לפני הסערה", slot: "verb", correct: "כיסו", distractors: ["ציירו", "שרו", "רקדו"] },
  { context: "הילד קיבל ___ מפתיעה ליום הולדתו", slot: "noun", correct: "מתנה", distractors: ["מכה", "ציון", "הערה"] },
  { context: "הסלע הגדול ___ את הדרך", slot: "verb", correct: "חסם", distractors: ["פתח", "הרחיב", "מחק"] },
  { context: "הרוח החזקה ___ את העצים מצד לצד", slot: "verb", correct: "ניענעה", distractors: ["שתלה", "שרשה", "צבעה"] },
  { context: "האם ___ עוגה טעימה לכבוד החג", slot: "verb", correct: "אפתה", distractors: ["תפרה", "ציירה", "כתבה"] },
  { context: "החוקר ___ ממצא חשוב באתר העתיקות", slot: "verb", correct: "גילה", distractors: ["שבר", "הסתיר", "מחק"] },
  { context: "העצים ___ את עליהם בסתיו", slot: "verb", correct: "משירים", distractors: ["מגדלים", "צובעים", "שותלים"] },
  { context: "הספינה ___ בים הסוער", slot: "verb", correct: "נטרפה", distractors: ["עפה", "רצה", "גדלה"] },
  { context: "המלצר הביא ___ ארוכה של מנות", slot: "noun", correct: "רשימה", distractors: ["חבילה", "שקית", "קופסה"] },
  { context: "החורף הקשה ___ נזק רב ליבולים", slot: "verb", correct: "גרם", distractors: ["מנע", "שמר", "הגן"] },
  { context: "הזמר ___ שיר חדש שכבש את הקהל", slot: "verb", correct: "הלחין", distractors: ["בישל", "תפר", "חרש"] },
  { context: "הם ___ את הבית לקראת החג", slot: "verb", correct: "קישטו", distractors: ["הרסו", "מכרו", "נטשו"] },
  { context: "הפרפר ___ מפרח לפרח בגינה", slot: "verb", correct: "עף", distractors: ["שחה", "חפר", "טיפס"] },
  // ── Additional vocab contexts ──
  { context: "הנגר ___ שולחן חדש מעץ אלון", slot: "verb", correct: "בנה", distractors: ["בישל", "תפר", "צייר"] },
  { context: "הכבאי ___ את השריפה בזמן", slot: "verb", correct: "כיבה", distractors: ["הדליק", "שתל", "שר"] },
  { context: "הרקדנית ___ על הבמה בקלילות", slot: "verb", correct: "רקדה", distractors: ["ישנה", "בישלה", "חרשה"] },
  { context: "האסטרונאוט ___ לחלל במעבורת", slot: "verb", correct: "טס", distractors: ["שחה", "רץ", "הלך"] },
  { context: "השוטר ___ את התנועה בצומת", slot: "verb", correct: "הסדיר", distractors: ["בישל", "שתל", "צייר"] },
  { context: "התרנגול ___ בכל בוקר כשהשמש זורחת", slot: "verb", correct: "קרא", distractors: ["ישן", "שחה", "רקד"] },
  { context: "הקוסם הוציא ___ מתוך הכובע", slot: "noun", correct: "ארנב", distractors: ["ספר", "כיסא", "מכונית"] },
  { context: "הצלם ___ תמונות יפות של הנוף", slot: "verb", correct: "צילם", distractors: ["בישל", "תפר", "חרש"] },
  { context: "הסופר ___ רומן חדש במשך שנתיים", slot: "verb", correct: "כתב", distractors: ["שתל", "חפר", "בנה"] },
  { context: "הטבח ___ מרק טעים מירקות", slot: "verb", correct: "בישל", distractors: ["כתב", "תפר", "צייר"] },
  { context: "בעל הגן ___ את הדשא בכל שבוע", slot: "verb", correct: "כסח", distractors: ["בישל", "כתב", "שר"] },
  { context: "הנהג חובש ___ בכל נסיעה", slot: "noun", correct: "חגורת בטיחות", distractors: ["כובע שמש", "עניבה", "צעיף"] },
  { context: "הצוללן ___ למעמקי הים", slot: "verb", correct: "צלל", distractors: ["טס", "רץ", "טיפס"] },
  { context: "האופה שם את הלחם ב___", slot: "noun", correct: "תנור", distractors: ["מקרר", "ארון", "מכונת כביסה"] },
  { context: "הממציא ___ מכשיר חדש שישנה את העולם", slot: "verb", correct: "המציא", distractors: ["שבר", "מחק", "השליך"] },
  { context: "הדבורים מייצרות ___ בכוורת", slot: "noun", correct: "דבש", distractors: ["חלב", "שמן", "מיץ"] },
  { context: "הגיאולוג חקר את ___ שבמערה", slot: "noun", correct: "הסלעים", distractors: ["הספרים", "החולצות", "המפתחות"] },
  { context: "הקברניט ___ את האונייה לנמל בבטחה", slot: "verb", correct: "הוביל", distractors: ["טס", "רץ", "קפץ"] },
  { context: "העלים ___ לאדמה בסתיו", slot: "verb", correct: "נשרו", distractors: ["עלו", "גדלו", "פרחו"] },
  { context: "השעון מראה את ___", slot: "noun", correct: "השעה", distractors: ["המזג אוויר", "המשקל", "הגובה"] },
];

function generateFromVocab(difficulty: number): GeneratedQuestion {
  const group = pick(VOCAB_CONTEXTS);
  const questionText = `השלימו את המשפט:\n${group.context}`;

  const allOptions = shuffle([group.correct, ...group.distractors]);
  const correctIndex = allOptions.indexOf(group.correct);

  const { options, correctAnswer } = makeOptions(allOptions, correctIndex);

  return {
    category: "sentence_completion",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `המילה הנכונה היא "${group.correct}" כי היא מתאימה לגוף המשפט`,
    tags: "vocabulary,אוצר_מילים",
    timeLimitSec: 45,
  };
}

// ── Main exports ──

export function generateSentenceCompletion(difficulty: number): GeneratedQuestion {
  // Mix template-based and vocabulary-based
  if (Math.random() < 0.5) {
    return generateFromTemplate(difficulty);
  }
  return generateFromVocab(difficulty);
}

export function generateSentenceCompletionBatch(
  count: number,
  difficulty?: number
): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const diff = difficulty ?? (1 + Math.floor(Math.random() * 5));
    results.push(generateSentenceCompletion(diff));
  }
  return results;
}
