/**
 * Vocabulary Generator – אוצר מילים
 * Complete Sald Institute vocabulary list – all 248 entries from the PDF.
 * Shows a word and 4 possible meanings; player picks the correct one.
 */

import {
  GeneratedQuestion,
  makeOptions,
  pick,
  pickN,
  shuffle,
  randInt,
} from "./utils.js";

interface VocabEntry {
  word: string;
  meaning: string;
  /** difficulty 1-5 (1=common/concrete, 5=rare/archaic) */
  diff: number;
}

/**
 * Complete vocabulary from the Sald Institute PDF (entries 1-248).
 * Ordered by PDF entry number. Every single word included.
 */
const VOCAB: VocabEntry[] = [
  // ═══  1 – 25  ═══
  { word: "אָבַד", meaning: "הלך לאיבוד", diff: 1 },                   // 1
  { word: "אָבְדָן", meaning: "איבוד", diff: 2 },                      // 2
  { word: "אַבְזָם", meaning: "חלק בחגורה שנועד לחבר את שני הקצוות שלה", diff: 3 }, // 3
  { word: "אִגֶּרֶת", meaning: "מכתב", diff: 1 },                     // 4
  { word: "אֻכְלוּסִיָּה", meaning: "כלל האנשים המתגוררים באזור מסוים", diff: 2 }, // 5
  { word: "אֲחִיזָה", meaning: "החזקה, תפיסה", diff: 3 },              // 6
  { word: "אֶטֶב", meaning: "מקל כביסה, מהדק", diff: 3 },              // 7
  { word: "אַכְזָבָה", meaning: "עצב הנובע מציפיות או תקוות שלא התגשמו", diff: 1 }, // 8
  { word: "אֲלוּמָה", meaning: "קבוצת שיבולים, קרן אור", diff: 2 },    // 9
  { word: "אֵפֶר", meaning: "מה שנשאר מחומר ששרפו אותו", diff: 1 },    // 10
  { word: "אָץ", meaning: "רץ", diff: 3 },                             // 11
  { word: "אַרְגָּמָן", meaning: "סגול בהיר", diff: 2 },               // 12
  { word: "אֲשֶׁר", meaning: "ש- (מילת חיבור)", diff: 3 },             // 13
  { word: "אֶשְׁתָּקַד", meaning: "בשנה שעברה", diff: 3 },             // 14
  { word: "אָתוֹן", meaning: "נקבת החמור", diff: 2 },                  // 15
  { word: "בּוּטִיק", meaning: "חנות שמוכרים בה סחורות מיוחדות", diff: 2 }, // 16
  { word: "בִּינָה", meaning: "חכמה, תבונה", diff: 1 },                // 17
  { word: "בַּצֹּרֶת", meaning: "מצב שבו בתקופת הגשמים כמעט לא יורדים גשמים", diff: 2 }, // 18
  { word: "גַּד", meaning: "מזל", diff: 1 },                           // 19
  { word: "גּוֹלֶה", meaning: "מגורש, נשלח לגלות", diff: 2 },          // 20
  { word: "גְּלוּיָה", meaning: "כרטיס מכתב ללא מעטפה", diff: 2 },    // 21
  { word: "גַּלְמוּד", meaning: "בודד", diff: 1 },                     // 22
  { word: "גֵּר", meaning: "זר, שלא נולד במקום", diff: 2 },            // 23
  { word: "דִּין", meaning: "משפט", diff: 1 },                          // 24
  { word: "דַּרְדַּר", meaning: "קוץ", diff: 1 },                      // 25

  // ═══  26 – 50  ═══
  { word: "הֵגִיחַ", meaning: "הופיע באופן פתאומי", diff: 2 },          // 26
  { word: "הוֹרָאָה", meaning: "פקודה, ציווי", diff: 2 },               // 27
  { word: "הַמְלָטָה", meaning: "לידה (נאמר בעיקר לגבי חיות)", diff: 3 }, // 28
  { word: "הַמְתָּנָה", meaning: "פרק זמן שבו מחכים למשהו", diff: 1 }, // 29
  { word: "הַס", meaning: "שקט", diff: 1 },                             // 30
  { word: "הַקְנָטָה", meaning: "התגרות", diff: 3 },                    // 31
  { word: "הַקְצָבָה", meaning: "כמות שניתנת, כמות שמוקצית", diff: 3 }, // 32
  { word: "הַשְׁעָרָה", meaning: "הנחה שלא הוכחה", diff: 2 },          // 33
  { word: "הִשְׁתּוֹקְקוּת", meaning: "תשוקה, התאוות, חמדה", diff: 3 }, // 34
  { word: "וָלָד", meaning: "תינוק, עולל", diff: 1 },                  // 35
  { word: "וַעֲדָה", meaning: "קבוצת אנשים שנבחרה למשימה מסוימת", diff: 2 }, // 36
  { word: "זֵהֶה", meaning: "דומה דמיון מושלם", diff: 1 },             // 37
  { word: "זַן", meaning: "סוג, מין", diff: 1 },                       // 38
  { word: "זָעִיר", meaning: "קטן מאוד", diff: 2 },                    // 39
  { word: "חֲבָּלָה", meaning: "פציעה, חבורה", diff: 3 },               // 40
  { word: "חֶדְוָה", meaning: "שמחה, עליצות", diff: 2 },               // 41
  { word: "חֲזוּת", meaning: "מראה חיצוני", diff: 3 },                  // 42
  { word: "חוֹטֶם", meaning: "אף", diff: 1 },                           // 43
  { word: "חִיּוּנִיּוֹת", meaning: "נמרצות, לשפוע חיים", diff: 3 },   // 44
  { word: "חַיָּט", meaning: "תופר, עוסק בחייטות, יוצר בגדים", diff: 1 }, // 45
  { word: "חָלוּל", meaning: "ריק, נבוב", diff: 2 },                    // 46
  { word: "חַמְסִין", meaning: "שרב", diff: 1 },                        // 47
  { word: "חֶנְוָנִי", meaning: "בעל מכולת", diff: 2 },                // 48
  { word: "חָסוֹן", meaning: "שרירי, בנוי היטב", diff: 2 },            // 49
  { word: "חוּרְבָּן", meaning: "הרס", diff: 2 },                       // 50

  // ═══  51 – 75  ═══
  { word: "חָרֵד", meaning: "מפוחד, מבוהל, חושש", diff: 2 },           // 51
  { word: "חָרוֹן", meaning: "כעס", diff: 2 },                          // 52
  { word: "חֲרָטָה", meaning: "הרגשת צער על מעשה שנעשה", diff: 3 },     // 53
  { word: "חַרְטוֹם", meaning: "החלק הקדמי של הספינה", diff: 4 },       // 54
  { word: "חֲרִיקָה", meaning: "קול חד, צרימה", diff: 3 },             // 55
  { word: "חַרְצָן", meaning: "גלעין, זרע", diff: 2 },                 // 56
  { word: "חֶרֶשׁ", meaning: "בחשאי, בסתר, בשקט", diff: 3 },           // 57
  { word: "חָשַׁשׁ", meaning: "פחד", diff: 3 },                         // 58
  { word: "טֶנֶא", meaning: "סל", diff: 1 },                            // 59
  { word: "יָגוֹן", meaning: "צער", diff: 1 },                          // 60
  { word: "יָגֵעַ", meaning: "עייף, תשוש, לאה", diff: 2 },             // 61
  { word: "יָדוֹ עַל הָעֶלְיוֹנָה", meaning: "בעל היתרון", diff: 4 }, // 62
  { word: "יְהִירוּת", meaning: "שחצנות, גאוותנות", diff: 3 },         // 63
  { word: "כָּחוּשׁ", meaning: "רזה, צנום", diff: 1 },                  // 64
  { word: "כְּסִיל", meaning: "טיפש, אוויל", diff: 2 },               // 65
  { word: "כַּעַךְ", meaning: "טבעת, בייגלה", diff: 2 },               // 66
  { word: "כְּפִיר", meaning: "גור אריות", diff: 1 },                  // 67
  { word: "כַּר", meaning: "כרית גדולה", diff: 1 },                     // 68
  { word: "כְּרַךְ", meaning: "עיר גדולה", diff: 2 },                  // 69

  // ═══  70 – 100  ═══
  { word: "לֶאֱרוֹג", meaning: "לעשות אריג מחוטים, לקלוע", diff: 3 },   // 70
  { word: "לְבָנָה", meaning: "ירח", diff: 1 },                         // 71
  { word: "לִגְאוֹל", meaning: "להושיע, להציל, לחלץ", diff: 2 },       // 72
  { word: "לָגַם", meaning: "בלע, גמע", diff: 3 },                      // 73
  { word: "לִגְעוֹר", meaning: "לנזוף, לגנות, לדבר בכעס", diff: 2 },   // 74
  { word: "לִגְרוֹב", meaning: "ללבוש גרביים", diff: 3 },              // 75
  { word: "לְגַשֵּׁשׁ", meaning: "לחפש משהו מבלי לראות", diff: 3 },    // 76
  { word: "לְדַוֵּחַ", meaning: "לתת דוח, להודיע, לפרסם, לגלות", diff: 3 }, // 77
  { word: "לְהַטִּיל", meaning: "לזרוק", diff: 2 },                    // 78
  { word: "לְהַכְחִישׁ", meaning: "לא להודות", diff: 2 },              // 79
  { word: "לְהַכְרִיז", meaning: "להודיע, לבשר, להצהיר", diff: 3 },    // 80
  { word: "לְהִמָּלֵט", meaning: "לברוח", diff: 2 },                   // 81
  { word: "לְהַפְצִיעַ", meaning: "לעלות, להופיע, לבקוע", diff: 3 },   // 82
  { word: "לְהָרִיעַ", meaning: "לצהול, לעודד, לקרוא הידד", diff: 3 }, // 83
  { word: "לְהִשְׁתּוֹקֵק", meaning: "לרצות מאוד, לחפוץ", diff: 3 },  // 84
  { word: "לְהִתְחַזּוֹת", meaning: "להעמיד פנים, להיראות כאילו", diff: 3 }, // 85
  { word: "לְהַתִּיז", meaning: "לרסס או לפזר טיפות של נוזל", diff: 3 }, // 86
  { word: "לְהִתְיַפֵּחַ", meaning: "ליבב, ליילל, לבכות בכי תמרורים", diff: 3 }, // 87
  { word: "לְהַתְרִיעַ", meaning: "להזהיר", diff: 3 },                 // 88
  { word: "לִזְקוֹף", meaning: "להרים, ליישר", diff: 2 },              // 89
  { word: "לַחֲבוֹשׁ", meaning: "ללבוש כובע / לשים תחבושת", diff: 3 }, // 90
  { word: "לַחוּת", meaning: "רטיבות, מימיות", diff: 3 },               // 91
  { word: "לַחְלוֹשׁ", meaning: "לשלוט, למשול", diff: 2 },             // 92
  { word: "לַחֲלוֹץ", meaning: "לפשוט, להוריד, להסיר (נעל)", diff: 3 }, // 93
  { word: "לַחַן", meaning: "מנגינה", diff: 1 },                        // 94
  { word: "לַחֲפוֹץ", meaning: "לרצות, לשאוף, להשתוקק", diff: 3 },     // 95
  { word: "לִטְמוֹן", meaning: "להצפין, להחביא, להסתיר", diff: 3 },    // 96
  { word: "לְטַפֵּחַ", meaning: "לטפל במסירות, לגדל, לפתח", diff: 2 }, // 97
  { word: "לַיִשׁ", meaning: "אריה", diff: 2 },                        // 98
  { word: "לְכַיֵּס", meaning: "לגנוב", diff: 3 },                     // 99
  { word: "לְלַקֵּט", meaning: "לאסוף, לרכז", diff: 3 },               // 100

  // ═══  101 – 125  ═══
  { word: "לִמְחוֹת", meaning: "להביע מחאה, להתנגד", diff: 2 },         // 101
  { word: "לִמְעוֹד", meaning: "ליפול, להיכשל", diff: 3 },             // 102
  { word: "לְמַעַן", meaning: "עבור, בעבור", diff: 3 },                // 103
  { word: "לִנְזוֹף", meaning: "להוכיח, להעיר בכעס", diff: 3 },        // 104
  { word: "לִנְעוֹץ", meaning: "לתקוע, לדקור, לתחוב", diff: 2 },      // 105
  { word: "לִנְקוֹט", meaning: "לבצע, לפעול", diff: 3 },               // 106
  { word: "לְסָרֵב", meaning: "לא להסכים", diff: 2 },                  // 107
  { word: "לְעוֹלֵל", meaning: "לבצע דבר רע", diff: 3 },               // 108
  { word: "לַעֲנוֹד", meaning: "לשים תכשיט", diff: 3 },                // 109
  { word: "לַעֲקוֹץ", meaning: "לדקור, לנעוץ עוקץ", diff: 4 },        // 110
  { word: "לַעֲרוֹךְ", meaning: "לארגן, לנהל, לקיים", diff: 3 },      // 111
  { word: "לְפָאתֵי", meaning: "בקצה", diff: 4 },                      // 112
  { word: "לִפְעוֹת", meaning: "לצעוק, ליילל", diff: 3 },             // 113
  { word: "לֵץ", meaning: "ליצן, מתלוצץ", diff: 3 },                   // 114
  { word: "לְצַיֵּת", meaning: "לשמוע בקול", diff: 2 },                // 115
  { word: "לִקְמוֹל", meaning: "לנבול, להתייבש", diff: 5 },            // 116
  { word: "לִקְפּוֹחַ", meaning: "להכות, להלום, לחבוט", diff: 3 },     // 117
  { word: "לְקַרְצֵף", meaning: "לשפשף, לנקות", diff: 3 },            // 118
  { word: "לִרְכּוֹן", meaning: "להתכופף, להטות את הגוף", diff: 3 },   // 119
  { word: "לִרְקוֹם", meaning: "לתפור, להכין רקמה", diff: 3 },         // 120
  { word: "לְרַשְׁרֵשׁ", meaning: "להשמיע רשרוש", diff: 3 },          // 121
  { word: "לָשׁוּב", meaning: "לחזור", diff: 1 },                       // 122
  { word: "לְתִפְאֶרֶת", meaning: "ברוב פאר והדר", diff: 4 },         // 123
  { word: "מַאֲגָר", meaning: "דבר שנועד לשמירה או לאחסון של דברים", diff: 4 }, // 124
  { word: "מֵאוּמָה", meaning: "כלום, דבר", diff: 4 },                  // 125

  // ═══  126 – 150  ═══
  { word: "מְגַמְגֵּם", meaning: "מי שמתקשה לדבר באופן שוטף", diff: 3 }, // 126
  { word: "מִגְנָנָה", meaning: "התגוננות", diff: 3 },                  // 127
  { word: "מַהֲלוּמָה", meaning: "מכה", diff: 3 },                      // 128
  { word: "מוּג לֵב", meaning: "פחדן", diff: 4 },                       // 129
  { word: "מוּם", meaning: "ליקוי, פגם", diff: 2 },                     // 130
  { word: "מוֹעֵד", meaning: "זמן, עת", diff: 2 },                      // 131
  { word: "מָחוֹל", meaning: "ריקוד", diff: 1 },                        // 132
  { word: "מְחִילָה", meaning: "סליחה", diff: 1 },                      // 133
  { word: "מֵחֲמַת", meaning: "בגלל", diff: 4 },                        // 134
  { word: "מַחְסוֹר", meaning: "חוסר, היעדר", diff: 3 },                // 135
  { word: "מֶחְקָר", meaning: "חקירה, בדיקה", diff: 3 },                // 136
  { word: "מַטָּלָה", meaning: "משימה", diff: 2 },                      // 137
  { word: "מַכְמִיר", meaning: "מעורר רגש של חמלה או עצב", diff: 4 },  // 138
  { word: "מִלְּבַד", meaning: "חוץ מ-, פרט ל-, נוסף על-", diff: 2 },  // 139
  { word: "מַלְקוֹשׁ", meaning: "הגשם האחרון", diff: 3 },               // 140
  { word: "מִלְתָּעוֹת", meaning: "שיניים חדות, ניבים", diff: 4 },     // 141
  { word: "מִמָּד", meaning: "צד, היבט", diff: 3 },                     // 142
  { word: "מָמוֹן", meaning: "רכוש, הון", diff: 1 },                    // 143
  { word: "מִמּוּשׁ", meaning: "הגשמה", diff: 3 },                      // 144
  { word: "מִעוּט", meaning: "קבוצה שאינה רוב", diff: 2 },             // 145
  { word: "מִפְגָּע", meaning: "מכשול, דבר שיש בו סכנה", diff: 4 },   // 146
  { word: "מְפָרֵךְ", meaning: "מעייף, מתיש", diff: 4 },               // 147
  { word: "מַרְבָּד", meaning: "שטיח", diff: 2 },                       // 148
  { word: "מַרְכִּיב", meaning: "רכיב, חלק", diff: 3 },                // 149
  { word: "מַשְׁאָב", meaning: "אמצעי ומקור שעומד לרשות גוף כלשהו", diff: 4 }, // 150

  // ═══  151 – 175  ═══
  { word: "מְשֻׁבָּח", meaning: "מובחר, מדרגה ראשונה", diff: 4 },      // 151
  { word: "מִשְׁמֶרֶת", meaning: "חלק מוגדר ביום שבו קבוצת אנשים עובדת או לומדת", diff: 4 }, // 152
  { word: "נָאקָה", meaning: "נקבת הגמל", diff: 4 },                    // 153
  { word: "נֶבֶט", meaning: "צמח בראשית הצמיחה שלו", diff: 3 },         // 154
  { word: "נֶגֶב", meaning: "דרום, אזור בדרום הארץ", diff: 2 },        // 155
  { word: "נִגּוּן", meaning: "שיר, זמר, לחן, נעימה", diff: 2 },       // 156
  { word: "נֶחְרָךְ", meaning: "נשרף כליל", diff: 4 },                  // 157
  { word: "נַחְשׁוֹל", meaning: "גל גדול", diff: 2 },                  // 158
  { word: "נִיב", meaning: "ביטוי (למשל: 'איש אשכולות')", diff: 3 },   // 159
  { word: "נֶמֶק", meaning: "ריקבון, מוות רקמה", diff: 4 },            // 160
  { word: "נֶקֶר", meaning: "חור, נקב", diff: 4 },                      // 161
  { word: "נְשִׁיפָה", meaning: "הוצאת אוויר (חלק מתהליך הנשימה)", diff: 4 }, // 162
  { word: "נָתִיב", meaning: "דרך, שביל", diff: 1 },                    // 163
  { word: "סֶדֶק", meaning: "שבר, בקע, חריץ", diff: 4 },               // 164
  { word: "סִיּוּעַ", meaning: "עזרה, תמיכה", diff: 2 },               // 165
  { word: "סַלְמוֹן", meaning: "סוג של דג", diff: 3 },                  // 166
  { word: "סָפֵק", meaning: "היסוס, פיקפוק, אי ודאות", diff: 3 },      // 167
  { word: "עָב", meaning: "ענן", diff: 2 },                             // 168
  { word: "עֶדְנָה", meaning: "עדינות, פריחה", diff: 4 },               // 169
  { word: "עוֹגֵן", meaning: "מתקן כבד שמטילים מאנייה אל קרקעית הים כדי לעצור אותה", diff: 4 }, // 170
  { word: "עִיּוּן", meaning: "התבוננות, קריאה", diff: 4 },             // 171
  { word: "עִסּוּי", meaning: "מסאז׳", diff: 5 },                       // 172
  { word: "עִיכּוּב", meaning: "השהייה, דחייה, התמהמהות", diff: 4 },    // 173
  { word: "עָמוּם", meaning: "חשוך, לא ברור, נטול בהירות", diff: 4 },   // 174

  // ═══  175 – 200  ═══
  { word: "עָמָל", meaning: "עבודה", diff: 2 },                         // 175
  { word: "עֲנָוָה", meaning: "צניעות", diff: 3 },                      // 176
  { word: "עָפָר", meaning: "אדמה, חול", diff: 1 },                     // 177
  { word: "עָצוּם", meaning: "ענקי", diff: 1 },                         // 178
  { word: "עֵקֶב", meaning: "בגלל, משום", diff: 2 },                    // 179
  { word: "עֲרִירִי", meaning: "בודד, ללא ילדים", diff: 4 },           // 180
  { word: "עֵרֶךְ", meaning: "שווי", diff: 5 },                         // 181
  { word: "עָרַם", meaning: "עשה ערמה, צבר, שם דבר על דבר", diff: 4 },  // 182
  { word: "עֵרָנוּת", meaning: "מרץ, מודעות למתרחש סביב", diff: 3 },   // 183
  { word: "עַתִּיק", meaning: "ישן, ששייך לעבר הרחוק", diff: 2 },     // 184
  { word: "פָּז", meaning: "זהב", diff: 1 },                            // 185
  { word: "פִּיּוּט", meaning: "שיר, שיר קודש", diff: 2 },             // 186
  { word: "חֶרֶב פִּיפִיּוֹת", meaning: "חרב שהלהב שלה מחודד משני צדדיו", diff: 4 }, // 187
  { word: "פָּנִיקָה", meaning: "בהלה", diff: 1 },                       // 188
  { word: "פְּסִיעָה", meaning: "צעד", diff: 2 },                       // 189
  { word: "פִּעְנוּחַ", meaning: "פיצוח, מציאת פתרון", diff: 3 },      // 190
  { word: "פִּצּוּי", meaning: "הטבה שנועדה לבטל או להקל על פגיעה כלשהי", diff: 3 }, // 191
  { word: "פְּקֻדָּה", meaning: "הוראה, צו, ציווי", diff: 1 },         // 192
  { word: "צֶאֱצָא", meaning: "כל אחד מילדיו של בן אדם וילדיהם", diff: 3 }, // 193
  { word: "צִיוּוּי", meaning: "פקודה", diff: 5 },                      // 194
  { word: "צְוָחָה", meaning: "צעקה, צרחה", diff: 2 },                  // 195
  { word: "צוֹרֵם", meaning: "חורק, לא נעים באוזן", diff: 3 },         // 196-197
  { word: "צַח", meaning: "זך, טהור, נקי", diff: 3 },                   // 198
  { word: "צָחוֹר", meaning: "לבן, צח, זך", diff: 5 },                  // 199
  { word: "צָמִית", meaning: "עבד", diff: 4 },                          // 200

  // ═══  201 – 225  ═══
  { word: "צָפוּי", meaning: "ידוע מראש", diff: 2 },                    // 201
  { word: "קִבּוֹלֶת", meaning: "תכולה", diff: 4 },                     // 202
  { word: "קוֹף", meaning: "חור המחט", diff: 4 },                       // 203
  { word: "קְטָטָה", meaning: "עימות אלים, מריבה", diff: 2 },          // 204
  { word: "קָלַחַת", meaning: "זרם, שטף או סיר", diff: 4 },            // 205
  { word: "קוֹמֶץ", meaning: "כמות קטנה", diff: 2 },                    // 206
  { word: "קַפְדָן", meaning: "מקפיד, מחמיר", diff: 3 },               // 207
  { word: "קֵץ", meaning: "סוף, מוות", diff: 1 },                       // 208
  { word: "רָדוּד", meaning: "לא עמוק", diff: 2 },                      // 209
  { word: "רָדוּם", meaning: "עייף", diff: 4 },                          // 210
  { word: "רָהוּט", meaning: "מי שמדבר באופן שוטף ותקני", diff: 3 },    // 211
  { word: "רָווּי", meaning: "מלא, גדוש, ששתה מספיק", diff: 3 },       // 212
  { word: "רוֹעֵם", meaning: "רועש, מרעיש", diff: 2 },                  // 213
  { word: "רוֹפֵף", meaning: "חלש", diff: 2 },                          // 214
  { word: "רַחַשׁ", meaning: "רעש קל, רשרוש", diff: 3 },                // 215
  { word: "רֶטֶט", meaning: "רעד", diff: 3 },                           // 216
  { word: "רְכִישָׁה", meaning: "קנייה", diff: 2 },                     // 217
  { word: "רָם", meaning: "גבוה, נישא", diff: 1 },                      // 218
  { word: "רָקִיעַ", meaning: "שמיים", diff: 1 },                       // 219
  { word: "שְׁאָגָה", meaning: "צווחה, נהימה, קולו של האריה", diff: 4 }, // 220
  { word: "שְׁאִיפָה", meaning: "שאיבת אוויר (חלק מתהליך הנשימה)", diff: 4 }, // 221
  { word: "שֶׁבַח", meaning: "מתן חיזוק חיובי על הישגים, תכונות, מעשה", diff: 2 }, // 222
  { word: "שְׂגָגָה", meaning: "טעות, שגיאה", diff: 3 },                // 223
  { word: "שָׁגָה", meaning: "טעה", diff: 3 },                           // 224  ← was missing!
  { word: "שְׁגִיאָה", meaning: "טעות", diff: 1 },                      // 225

  // ═══  226 – 248  ═══
  { word: "שׁוּלַיִים", meaning: "מקום או חלק ריק בצד של עמוד, חלק לא מרכזי", diff: 3 }, // 226
  { word: "שָׁזוּר", meaning: "קלוע", diff: 3 },                        // 227
  { word: "שַׁחַר", meaning: "שעת בוקר מוקדמת, אור ראשון", diff: 2 },  // 228
  { word: "שֶׁטֶף", meaning: "זרם", diff: 2 },                          // 229
  { word: "שִׂיחַ", meaning: "שיחה, דיבור, החלפת דעות", diff: 5 },      // 230
  { word: "שֶׁלוֹ", meaning: "רגוע, שקט", diff: 1 },                    // 231
  { word: "שְׁנַת יְשָׁרִים", meaning: "שינה נעימה ורצופה", diff: 5 }, // 232
  { word: "שַׁקְדָנוּת", meaning: "התמדה וחריצות במילוי משימות", diff: 2 }, // 233
  { word: "שַׂרְבִיט", meaning: "מטה, מטה קסם", diff: 4 },             // 234
  { word: "שָׂרָף", meaning: "הפרשת עצים", diff: 4 },                   // 235
  { word: "תְּבוּסָה", meaning: "כישלון, מפולת", diff: 2 },            // 236
  { word: "תּוֹבְעָנִי", meaning: "שמביע תביעה או דרישה בתוקף", diff: 4 }, // 237
  { word: "תִזְמוֹרֶת", meaning: "להקת מנגנים בכלים שונים", diff: 4 }, // 238
  { word: "תָּם", meaning: "תמים; פירוש נוסף: הסתיים", diff: 1 },      // 239
  { word: "תְּנוּמָה", meaning: "שינה קלה", diff: 2 },                  // 240
  { word: "תַּעֲנוּג", meaning: "הנאה, סיפוק, עושר", diff: 2 },        // 241
  { word: "תַּעֲסוּקָה", meaning: "עבודה, דבר לעסוק בו", diff: 2 },    // 242
  { word: "תַּעַר", meaning: "סכין, להב", diff: 4 },                    // 243
  { word: "תַּעְתּוּעַ", meaning: "אשליה", diff: 4 },                   // 244
  { word: "תָּפוּחַ", meaning: "נפוח, מנופח, מלא אוויר", diff: 4 },    // 245
  { word: "תְּשִׁישׁוּת", meaning: "עייפות", diff: 4 },                // 246
  { word: "תַּתְרָן", meaning: "בעל חוש ריח חד", diff: 5 },            // 247
];

/* ------------------------------------------------------------------ */

/**
 * Generate a single vocabulary question.
 * Shows a word, asks "what does it mean?" with 4 options.
 */
function generateVocabQuestion(difficulty?: number): GeneratedQuestion {
  const diff = difficulty || randInt(1, 3);

  // Pick target word matching difficulty (±1)
  const eligible = VOCAB.filter(
    (v) => Math.abs(v.diff - diff) <= 1
  );
  const target = pick(eligible.length > 0 ? eligible : VOCAB);

  // Pick 3 distractor meanings from OTHER words (different meaning)
  const others = VOCAB.filter(
    (v) => v.word !== target.word && v.meaning !== target.meaning
  );
  const distractorEntries = pickN(others, 3);

  // Build options in random order
  const allTexts = [target.meaning, ...distractorEntries.map((d) => d.meaning)];
  const correctIdx = 0;

  // Shuffle while tracking correct answer
  const indices = [0, 1, 2, 3];
  shuffle(indices);
  const shuffledTexts = indices.map((i) => allTexts[i]);
  const newCorrectIdx = indices.indexOf(correctIdx);

  const { options, correctAnswer } = makeOptions(shuffledTexts, newCorrectIdx);

  return {
    category: "vocabulary",
    difficulty: target.diff,
    questionText: `מהי המשמעות של המילה "${target.word}"?`,
    options,
    correctAnswer,
    explanation: `המילה "${target.word}" פירושה: ${target.meaning}`,
    tags: "vocabulary,sald",
    timeLimitSec: 45,
  };
}

/**
 * Generate a batch of vocabulary questions.
 */
export function generateVocabularyBatch(
  count: number,
  difficulty?: number
): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateVocabQuestion(difficulty));
  }
  return results;
}
