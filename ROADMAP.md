📌 מפת דרכים וארכיטקטורת המערכת (ROADMAP.md)
מסמך זה מהווה את מקור האמת הארכיטקטוני (Source of Truth) הרשמי עבור פרויקט משחק הקטאן הדיגיטלי (Catan Game), עם תמיכה מלאה בהרחבות "יורדי הים" (Seafarers), "סוחרים וברברים" (Merchants & Barbarians), ו-"ערים ואבירים" (Cities & Knights). מסמך זה נועד להבטיח שימור קונטקסט ומעקב מושלם אחר מבנה הקוד, הלוגיקה שלו ושלבי ההתקדמות של הפרויקט.

📂 1. סריקה ומיפוי של עץ הקבצים והתיקיות (catan-game/src/src)
להלן מבנה התיקיות וקבצי הליבה המרכזיים של המערכת כפי שהם קיימים בפועל בקוד:

Plaintext
catan-game/src/src/
├── App.tsx                       # הרכיב הראשי של האפליקציה
├── App.css                       # עיצובים גלובליים של האפליקציה
├── fonts.css                     # הגדרות גופנים לוקאליים
├── index.css                     # הגדרות CSS בסיסיות ואינטגרציית Tailwind
├── main.tsx                      # נקודת הכניסה הראשית (Entry Point) של React
├── vite-env.d.ts                 # הגדרות סביבה וטיפוסים של Vite
├── assets/                       # קבצי מדיה, תמונות וגופנים לוקאליים
│   └── react.svg
├── compat/                       # תיקיית מעקפי תאימות ופתרונות ספרייה
│   └── threeTimerCompat.js       # פתרון תאימות עבור THREE.Timer/Clock מול @react-three/fiber
├── config/                       # קונפיגורציות ופריסות לוחות משחק
│   ├── citiesKnightsProgressCards.ts # הגדרות חלוקת קלפי הקידמה (Science, Politics, Trade) ל"ערים ואבירים"
│   ├── gameRules.ts              # הגדרות חוקים וערכי יעד (כגון נקודות ניצחון ויעדים להרחבות)
│   ├── seafarersBoardPreset.ts   # פריסות קבועות עבור הרחבת יורדי הים
│   ├── seafarersPresets.ts       # פריסות 3 ו-4 שחקנים עבור סנאריוז מגוונים
│   ├── standardVersion.ts        # הגדרות ומשאבים של גרסת הבסיס
│   ├── starterBoardPreset.ts     # פריסת לוח התחלתית סטנדרטית
│   └── scenarios/                # תרחישים (סנאריוז) ייעודיים להרחבת יורדי הים
│       ├── clothForCatan.ts        # תרחיש 6 - Cloth for Catan (בגדים לקטאן)
│       ├── fogIsland.ts            # תרחיש 3 - Fog Island
│       ├── fourIslands.ts          # תרחיש 2 - Four Islands
│       ├── headingForNewShores.ts  # תרחיש 1 - Heading for New Shores
│       ├── index.ts                # ייצוא מרוכז של התרחישים
│       ├── lostTribe.ts            # תרחיש 5 - The Lost Tribe (השבט האבוד)
│       ├── pirateIslands.ts        # תרחיש 7 - Pirate Islands (איי הפיראטים)
│       └── throughTheDesert.ts     # תרחיש 4 - Through the Desert
├── context/                      # ניהול מצב גלובלי (React Context)
│   ├── BoardContext.tsx          # ניהול פריסת הלוח, האריחים, הצמתים והצלעות
│   ├── GameContext.tsx           # ניהול שלבי המשחק, חוקים, מהלכים ולוגים
│   ├── GameUIContext.tsx         # ניהול מצבי ממשק המשתמש (אינטראקציה, פופאפים, עגלות)
│   ├── PlayerContext.tsx         # ניהול רשימת השחקנים, משאבים, סחורות, קלפי פיתוח/קידמה ונקודות
│   └── UserContext.tsx           # ניהול פרטי המשתמש המקומי, דירוג (Rating), סטטיסטיקות ומודאלים
├── hooks/                        # לוגיקה ייעודית מופרדת (Custom Hooks)
│   ├── useAppTrade.ts            # ניהול הצעות ומסחר במערכת האפליקציה
│   ├── useAppTrophies.ts         # ניהול הישגים וגביעים
│   ├── useBoardInteraction.ts    # טיפול בלחיצות על קודקודים, צלעות ואריחים
│   ├── useBoardTextures.ts       # טעינה וניהול טקסטורות ללוח התלת-ממדי
│   ├── useBotTimer.ts            # ניהול זמני ההמתנה ותורי הבוטים (AI)
│   ├── useBuild.ts               # ניהול פעולות בנייה (כבישים, יישובים, ערים, ספינות, אבירים, חומות)
│   ├── useDice.ts                # ניהול זריקת הקוביות (כולל קוביית האירועים של ערים ואבירים)
│   ├── useEdgeInteraction.ts     # טיפול באינטראקציה ישירה עם צלעות הלוח
│   ├── useOnlineGameSync.ts      # סנכרון וניהול מצב משחק מרובה משתתפים מול השרת
│   ├── useTrade.ts               # ניהול ממשק המסחר בין שחקנים ועם הבנק
│   ├── useTurnManager.ts         # ניהול מחזור התור, שלבי משנה, סבבי הקמה והתקפות ברברים
│   └── useVertexInteraction.ts   # טיפול באינטראקציה ישירה עם קודקודי הלוח (בנייה, אבירים, עגלות)
├── services/                     # שירותי תקשורת ואינטגרציה
│   ├── firebase.ts               # אתחול שירותי Firebase (אימות ופרופילי משתמשים)
│   ├── gameApi.ts                # ממשקי API של המשחק
│   ├── gameDispatcher.ts         # ניהול וניתוב פעולות משחק לוקאליות וסנכרון מול הרשת
│   ├── socket.ts                 # ניהול תקשורת WebSocket בזמן אמת
│   ├── tauriCommands.ts          # פקודות אינטגרציה עם Tauri
│   ├── gemini/                   # אינטגרציה למודל השפה של גוגל (Gemini LLM) לקבלת החלטות
│   │   ├── boardSerializer.ts    # סיראליזציה של מצב הלוח והמשחק לקלט מותאם ל-Gemini
│   │   ├── geminiService.ts      # שירות קריאה ל-API של Gemini וניהול הפרומפטים
│   │   ├── GeminiSettingsModal.tsx # מודאל הגדרת מפתח API וסוג המודל עבור AI
│   │   └── geminiTypes.ts        # הגדרות טיפוסים, ממשקים וקונפיגורציות ל-Gemini
│   └── network/                  # רכיבי תקשורת רשת בזמן אמת
│       ├── socketService.ts      # שירות התחברות לשרת WebSocket וניהול חדרי משחק
│       └── UpdateNotification.tsx # רכיב התרעות והודעות על עדכוני רשת
├── types/                        # טיפוסים והגדרות סוגים (TypeScript Typings)
│   ├── boardElements.types.ts    # טיפוסי צמתים (Vertices), צלעות (Edges) ומבנים
│   ├── citiesKnights.types.ts    # טיפוסי ערים ואבירים (אבירים, סחורות, ברברים, קלפי קידמה)
│   ├── game.types.ts             # טיפוסי שלבי משחק, סנאריוז ושלבי משנה
│   ├── gameActions.types.ts      # טיפוסי פעולות משחק (Game Actions) לסנכרון ומעקב מהלכים
│   ├── hex.types.ts              # טיפוסי קואורדינטות משושים ואריחים (Hex Tiles)
│   ├── player.types.ts           # טיפוסי שחקנים, בוטים, אסטרטגיות, מטבעות ומצבי עגלה
│   ├── rating.types.ts           # הגדרות טיפוסים עבור מערכת הדירוג והסטטיסטיקות
│   └── resources.types.ts        # הגדרות סוגי משאבים, סחורות (Commodities) וקלפים
├── utils/                        # פונקציות עזר ומנועי חישוב מורכבים
│   ├── boardTooltipHelpers.ts    # פונקציות עזר להצגת חלוניות מידע (Tooltips)
│   ├── ai/                       # מערכת קבלת החלטות ומנוע של שחקני בוט (AI)
│   │   ├── aiController.ts       # ניהול קבלת ההחלטות הראשי של הבוט לפי שלב
│   │   ├── aiNames.ts            # מחולל שמות לבוטים
│   │   ├── botReactiveActions.ts # מנוע תגובות והחלטות ייעודי לבוטים בערים ואבירים
│   │   ├── getMediumBotTarget.ts # חישוב מטרות אופטימליות לבוטים ברמה בינונית
│   │   ├── rating/               # מנגנון ניהול וחישוב דירוג והתקדמות שחקן
│   │   │   └── ratingCalculator.ts
│   │   ├── decisionMakers/       # מנגנוני בחירה והחלטות של הבוט
│   │   │   ├── chooseBuildPhase.ts
│   │   │   ├── chooseRobberTarget.ts
│   │   │   ├── proposeTrade.ts
│   │   │   └── respondToTrade.ts
│   │   ├── evaluators/           # הערכת אריחים, צמתים ומהלכים אופטימליים לבוט
│   │   │   ├── aiTradeEvaluator.ts
│   │   │   ├── aiYieldEvaluator.ts
│   │   │   ├── evaluateEdges.ts
│   │   │   ├── evaluateNeeds.ts
│   │   │   └── evaluateVertices.ts
│   │   ├── helpers/              # עזרי קבלת החלטות לבוט
│   │   │   ├── devCardManager.ts
│   │   │   └── riskManager.ts
│   │   ├── phases/               # ניהול מהלכי בוט לפי שלבי המשחק
│   │   │   ├── robberPhase.ts
│   │   │   ├── setupPhase.ts
│   │   │   └── tradeAndBuildPhase.ts
│   │   └── strategies/           # אסטרטגיות משחק שונות של הבוטים
│   │       ├── balancedPortStrategy.ts
│   │       ├── cityDevStrategy.ts
│   │       ├── longestRoadStrategy.ts
│   │       └── types.ts
│   ├── array/                    # עזרי מערכים (ערבוב חפיסות)
│   │   └── shuffleArray.ts
│   ├── gameEngine/               # מנוע חוקי המשחק הראשי
│   │   ├── checkLongestRoad.ts   # חישוב אורך הכבישים והספינות (הדרך הארוכה)
│   │   ├── checkWin.ts           # בדיקת תנאי ניצחון והשגת נקודות
│   │   ├── distributeInitialResources.ts # חלוקת משאבים ראשונית
│   │   ├── distributeResources.ts # חלוקת משאבים וסחורות שוטפת (Commodities)
│   │   ├── fogHelpers.ts         # פונקציות עזר לתרחיש איי הערפל
│   │   ├── generateBoard.ts      # יצירת הלוח והאריחים
│   │   ├── generateEdges.ts      # יצירת הצלעות
│   │   ├── generateVertices.ts   # יצירת הקודקודים
│   │   ├── getOpenShipsForPlayer.ts # זיהוי ספינות פתוחות הניתנות להזזה
│   │   ├── getVertexIslandIds.ts    # זיהוי מזהי האיים
│   │   ├── lostTribeHelpers.ts   # פונקציות עזר לתרחיש השבט האבוד
│   │   ├── moveRobber.ts         # העברת השודד/פיראט
│   │   ├── pirateIslands.ts      # לוגיקה ייעודית לתרחיש איי הפיראטים
│   │   ├── robberSteal.ts        # גניבת קלפים משחקנים שכנים
│   │   ├── rollDice.ts           # חישוב תוצאות הקוביות וקוביית האירועים
│   │   └── turnSnapshots.ts      # צילומי מצב לשחזור מהלכים (Undo)
│   ├── hexMath/                  # מתמטיקה גיאומטרית של רשת משושים
│   │   ├── board3DMath.ts        # המרות עבור תלת-מימד
│   │   ├── boardGeometryHelpers.ts # חישובים גיאומטריים של הלוח
│   │   ├── boardRenderCache.ts   # מטמון רינדור לוח
│   │   ├── cubeToPixel.ts        # המרת קואורדינטות קובייה לפיקסלים
│   │   ├── getHexDistance.ts     # חישוב מרחקים
│   │   ├── getHexNeighbors.ts    # מציאת אריחים שכנים
│   │   ├── getHexPointsString.ts # מחולל קודקודי משושה
│   │   ├── getHexVertexCoordinates.ts # קואורדינטות קודקודים
│   │   ├── normalizeModel.ts     # נרמול ומירכוז מודלים תלת-ממדיים
│   │   ├── parseEdgeId.ts        # חילוץ קודקודים מזהה צלע
│   │   ├── parseVertexId.ts      # חילוץ אריחים מזהה קודקוד
│   │   └── tileGeometryEffects.ts# אפקטים גיאומטריים של אריחים
│   └── validation/               # מערכת חוקים ואישור מהלכי בנייה
│       ├── validateRoadPlacement.ts       # ולידציית בניית כביש
│       ├── validateSettlementPlacement.ts # ולידציית בניית יישוב
│       └── validateShipPlacement.ts       # ולידציית בניית ספינה
└── components/                   # רכיבי הממשק הוויזואליים (React Components)
    ├── actions/                  # פאנלים וכפתורי פעולות
    │   ├── ActionSidebar.tsx     # סרגל פעולות צידי
    │   ├── BuildActionsPanel.tsx # פאנל שליטה על רכישות ובנייה
    │   ├── BuildMenu.tsx         # תפריט אפשרויות בנייה
    │   ├── CitiesKnightsPanel.tsx# פאנל שליטה מרכזי ל"ערים ואבירים" (אבירים, קלפי קידמה, ברברים)
    │   ├── DiceButton.tsx        # כפתור הטלת קוביות
    │   ├── GoldTradePanel.tsx    # פאנל המרת זהב
    │   ├── RollDiceContainer.tsx # מיכל הטלת קוביות
    │   ├── TradePanel.tsx        # פאנל ניהול מסחר
    │   └── WagonUpgradePanel.tsx # פאנל עגלת המסחר (M&B)
    ├── auth/                     # רכיבי הזיהוי וההרשמה
    │   └── AuthWidget.tsx        # ווידג'ט ניהול המשתמש המחובר בסרגל העליון
    ├── board/                    # רכיבי הלוח הוויזואלי
    │   ├── Board3DScene.tsx      # סצנת תלת-מימד ראשית
    │   ├── Clouds3D.tsx          # שכבת עננים תלת-ממדית
    │   ├── EdgeLine.tsx          # צלע אינטראקטיבית
    │   ├── GameBoard.tsx         # רכיב הלוח הדו-ממדי
    │   ├── GameBoard3D.tsx       # רכיב תצוגת תלת-מימד מבוסס R3F
    │   ├── HexTile.tsx           # אריח משושה דו-מימד
    │   ├── HexTile3D.tsx         # מודל אריח תלת-ממדי
    │   ├── NumberToken.tsx       # אסימון מספר דו-ממדי
    │   ├── NumberToken3D.tsx     # אסימון מספר תלת-ממדי
    │   ├── ResourceFlowOverlay.tsx # אנימציית זרימת משאבים
    │   ├── Road3D.tsx            # מודל תלת-מימד של כביש/ספינה
    │   ├── Structure3D.tsx       # מודל תלת-מימד של יישובים וערים
    │   ├── VertexNode.tsx        # קודקוד אינטראקטיבי
    │   └── 3d/                   # מודלים מיוחדים בתלת-מימד
    │       ├── BarbarianShip3D.tsx # מודל ספינת הברברים (ערים ואבירים)
    │       ├── Birds3D.tsx       # מודל ציפורים
    │       ├── Dolphin3D.tsx     # מודל דולפין
    │       ├── Harbor3D.tsx      # דגם נמל
    │       ├── Knight3D.tsx       # מודל תלת-ממדי של אביר (רמות 1-3, פעיל/לא פעיל)
    │       ├── Pirate3D.tsx      # דגם שודד ים
    │       ├── Robber3D.tsx      # דגם שודד יבשתי
    │       ├── SheepGroup3D.tsx  # מודל עדר כבשים
    │       └── Wagon3D.tsx       # דגם עגלת מסחר
    ├── common/                   # רכיבים משותפים
    │   ├── BotTimerIndicator.tsx # מחוון זמן לפעולת הבוט
    │   ├── Icons.tsx             # ספריית אייקונים
    │   └── TransparentImage.tsx  # רכיב תמונה שקופה
    ├── lobby/                    # מסכי הלובי ותהליך הגדרת המשחק
    │   ├── LobbyChat.tsx         # צ'אט מובנה בחדר ההמתנה
    │   ├── LobbyScreen.tsx       # מסך הגדרה ראשי
    │   ├── types.ts              # טיפוסי נתוני הלובי
    │   ├── modals/
    │   │   ├── MapModal.tsx      # תצוגת מפה מקדימה
    │   │   └── OnlineRoomModal.tsx # מודאל יצירה והצטרפות לחדרי אונליין
    │   └── steps/                # שלבי ההגדרה בלובי
    │       ├── LobbyStep1_Theme.tsx      # בחירת ערכת נושא
    │       ├── LobbyStep2_Expansion.tsx  # בחירת הרחבות (בסיס, יורדי הים, M&B, ערים ואבירים)
    │       ├── LobbyStep3_PlayerCount.tsx# הגדרת כמות שחקנים
    │       └── LobbyStep4_PlayersSetup.tsx# הגדרת צבעים ושמות
    ├── modals/                   # מודאלים אינטראקטיביים של המשחק
    │   ├── AuthModal.tsx               # מודאל התחברות והרשמה
    │   ├── DiscardOverlay.tsx          # מודאל השלכת קלפים
    │   ├── GameModalsManager.tsx       # מנהל מרוכז של כל מודאלי המשחק
    │   ├── GameOverRatingModal.tsx     # מודאל סיכום וחישוב שינוי דירוג
    │   ├── GameRulesModal.tsx          # מודאל חוקים והסברים מורחבים להרחבות
    │   ├── GoldFieldSelectionModal.tsx # מודאל בחירת משאב ממכרה זהב
    │   ├── MonopolyModal.tsx           # מודאל שימוש בקלף מונופול
    │   ├── OnlineRoomModal.tsx         # מודאל חדרים מקוונים
    │   ├── PlayerStatsModal.tsx        # מודאל פרופיל וסטטיסטיקות
    │   ├── TrophyModal.tsx             # מודאל הישגים
    │   ├── UnifiedTradeModal.tsx       # מודאל מסחר מאוחד
    │   └── YearOfPlentyModal.tsx       # מודאל קלף שנת שפע
    ├── notifications/            # לוגים והודעות מערכת
    │   ├── GameLog.tsx           # יומן אירועי המשחק
    │   └── PhaseGuide.tsx        # מדריך ויזואלי של שלב המשחק
    └── playerPanel/              # לוחות מידע של השחקנים
        ├── DevelopmentCardsPanel.tsx # פאנל קלפי פיתוח
        ├── ResourceCard.tsx      # כרטיס משאב/סחורה ויזואלי
        └── ResourceContainer.tsx # מיכל משאבי השחקן
🛠️ 2. פירוט ארכיטקטורה ולוגיקת ליבה (Core Logic Analysis)
🧩 generateBoard.ts (מייצר הלוחות הראשי)
תפקידו במערכת: יצירת מערך אריחי המשושים (HexTile[]) שמרכיבים את לוח המשחק, בהתאם לקונפיגורציה, להרחבה הספציפית וסוג הלוח.

לוגיקה ומנגנון:

מקבל פרמטרים כגון סוג המשחק (בסיס, יורדי הים, סוחרים וברברים, ערים ואבירים), סוג הפריסה (אקראית RANDOM או מובנית STARTER), הסנאריו הפעיל ומספר השחקנים.

במקרה של הרחבת "ערים ואבירים", האריחים נוצרים עם תמיכה בייצור סחורות (Commodities) מערים הצמודות ליערות (נייר), הרים (מטבעות) ומרעים (בדים).

במקרה של "יורדי הים", טוען פריסות סטטיות ומערבב משאבים ואסימוני מספרים בצורה חכמה לפי אזורים מוגדרים (1-7 תרחישים רשמיים).

⏳ useTurnManager.ts (מנהל מחזור התורות והשלבים)
תפקידו במערכת: מנהל את המכונה המצבית (State Machine) של מחזורי התור והשלבים השונים במשחק.

לוגיקה ומנגנון:

עוקב אחר המעבר בין שלבי משחק ראשיים ותתי-שלבים.

אינטגרציה ל-"ערים ואבירים": הטלת קוביית האירועים (Event Die) יחד עם הקוביות האדומות והצהובות. תמיכה בקידום ספינת הברברים בצעד אחד בעת התקבלות תוצאת ברברים, חלוקת קלפי קידמה בעת הטלת סמלי שערים (Science, Politics, Trade), וניהול תורי התקפת הברברים (barbarianLossQueue) כאשר הספינה מגיעה למשבצת 7.

⛵ 3. סטטוס משימות הרחבת "יורדי הים" (Seafarers)
הרחבת "יורדי הים" כוללת 7 תרחישים רשמיים מלאים וממומשים בקוד:

✅ משימות שהושלמו בהצלחה (100% מוכנות)
[x] תרחיש 1: חופים חדשים (Heading for New Shores): פריסה מלאה ל-3 ו-4 שחקנים, 14 אריחי יבשה באי המרכזי ו-8 באיים הזרים.

[x] תרחיש 2: ארבעת האיים (Four Islands): התפלגות מספרים רשמית, שודד יבשתי על אריח 12, פיראט במים ו-9 נמלים פעילים.

[x] תרחיש 3: איי הערפל (Fog Island): מאגר קבוע של 12 אריחים ו-10 אסימוני מספרים; חשיפת אריחים דינמית בעת בניית ספינות/כבישים לכיוון הערפל.

[x] תרחיש 4: דרך המדבר (Through the Desert): preset ייעודי ל-3/4 שחקנים, בונוס +2 VP על התיישבות ראשונה באיי הפריפריה, הגבלת הקמה באי הראשי, יעד ניצחון 14 נקודות.

[x] תרחיש 5: השבט האבוד (The Lost Tribe): פריסת 51 אריחים, 18 מתנות קצה (VP, קלף פיתוח, נמלים לאיסוף), שלב HARBOR_PLACEMENT ייעודי להצבת נמלים שנאספו, יעד ניצחון 13 נקודות.

[x] תרחיש 6: בגדים לקטאן (Cloth for Catan): כפרים של השבט האבוד המפיקים סחורות ובדים, חלוקת מטבעות וסחורות בעת חיבור קווי ספנות, אכיפת חוקים וקואורדינטות מותאמות.

[x] תרחיש 7: איי הפיראטים (Pirate Islands): מסלול צי הפיראטים הסטטי (PIRATE_ISLANDS_FLEET_ROUTE), המבצרים הנדרשים לכיבוש באמצעות ספינות קרב (PIRATE_ISLANDS_FORTRESSES), מטרות התיישבות ומכניקת כיבוש מלאה.

🚚 4. סטטוס משימות הרחבת "סוחרים וברברים" (Merchants & Barbarians)
✅ משימות שהושלמו בהצלחה (100% מוכנות)
[x] מערכת מטבעות זהב (Gold Coins): מנגנון חלוקת מטבעות זהב כפיצוי על תורים חלשים שבהם הטלת הקוביות אינה מניבה משאבים.

[x] משימות הובלה ושיירות (Wagon & Convoys): תנועת עגלות על קודקודי הלוח (wagonPosition), חישוב עלויות תנועה, דמי מעבר על כבישי יריב ושדרוגי עגלה.

[x] אריחי הרחבה מיוחדים: טעירת אריחי CASTLE (טירה), QUARRY (מחצבה), ו-GLASSWORKS (מפעל זכוכית).

[x] אינטגרציה תלת-ממדית: המודל Wagon3D.tsx המציג את העגלות על גבי לוח התלת-מימד ב-GameBoard3D.tsx.

⚔️ 5. הרחבת "ערים ואבירים" (Cities & Knights) - ארכיטקטורה ולוגיקה
הרחבת "ערים ואבירים" ממומשת במלואה במערכת וכוללת את המנגנונים המורכבים הבאים:

✅ מנגנונים ומכניקות ממומשות (100% מוכנות)
[x] מכניקת אבירים מורכבת (Knights System):

בניית אבירים על גבי קודקודים פנויים או מחוברים (Knight3D.tsx).

3 רמות אבירים: בסיסי (Basic - רמה 1), חזק (Strong - רמה 2), אדיר (Mighty - רמה 3).

הפעלת אבירים (active) באמצעות תשלום חיטה 1.

פעולות אביר: הזזת השודד, נישול/גירוש אביר יריב ברמה נמוכה יותר (pendingDisplacedKnight), וחסימת בנייה.

[x] ספינת הברברים והתקפותיהם (Barbarians Attack):

קידום ספינת הברברים על סולם של 0 עד 7 בכל הטלת ברברים בקוביית האירועים (BarbarianShip3D.tsx).

חישוב כוח ההגנה של קטאן (סכום רמות האבירים הציבוריים הפעילים) מול כוח הברברים (סך הערים בלוח).

ניצחון קטאן: הענקת תואר "מגן קטאן" (1 VP) לשחקן שתרם את הכוח הגבוה ביותר.

נפילת ערים: כאשר הברברים מנצחים, השחקנים שתרמו הכי פחות מאבדים עיר והיא מונחת בחזרה כיישוב (barbarianLossQueue).

[x] קלפי קידמה (Progress Cards) ושיפורי ערים:

3 חפיסות קלפים ייעודיות: מדע (Science), פוליטיקה (Politics), ומסחר (Trade) - 18 קלפים בכל חפיסה (citiesKnightsProgressCards.ts).

מנגנון שליפת קלפים לפי רמת שיפורי הערים (Politics, Science, Trade) והטלת קוביית האירועים.

מימוש קלפים מיוחדים: Alchemist, Crane, Engineer, Spy, Saboteur, Merchant, Bishop, Deserter, Diplomat ועוד.

[x] סחורות (Commodities):

ייצור סחורות ייחודיות מתוך ערים בלבד: מטבעות (Coin - מהרים), נייר (Paper - מיערות), ובדים (Cloth - ממרעים).

שימוש בסחורות לשדרוג מסלולי שיפור הערים עד לרמה 5.

[x] מטרופולין וחומות עיר (Metropolis & City Walls):

הפיכת עיר למטרופולין (2 VP נוספים, חסינות מברברים) ברמה 4 של שיפור עיר.

בניית חומת עיר (wall.glb) המגדילה את מגבלת הקלפים ביד ב-2 קלפים מפני השודד בקוביות 7.

[x] בינה מלאכותית לבוטים (botReactiveActions.ts):

מנוע קבלת החלטות ייעודי לבוטים בערים ואבירים: הפעלת אבירים לפני התקפת ברברים, שדרוג אבירים, ניהול סחורות, משחק קלפי קידמה אסטרטגי ומרוץ למטרופולין.

🤖 6. שילוב רשת (Multiplayer) ובינה מלאכותית (Gemini AI Bot)
✅ משימות שהושלמו בהצלחה (100% מוכנות)
[x] תשתית חדרים מקוונים: OnlineRoomModal.tsx ליצירת חדרים והצטרפות.

[x] חיבור בזמן אמת (WebSockets): socketService.ts לתקשורת מול שרת ה-Render.

[x] צ'אט בזמן אמת בלובי: רכיב LobbyChat.tsx מעוצב עם שמות צבעוניים.

[x] מודל פעולות ריכוזי (Action Dispatcher): gameDispatcher.ts לסנכרון GameAction אחיד.

[x] אינטגרציה לבינה מלאכותית (Gemini LLM): שירות geminiService.ts המשתמש ב-gemini-2.5-flash לקבלת החלטות מהלכים, כולל הסברים בעברית (reasoningInHebrew).

🏆 7. מנוע חוקי המשחק המרכזי ומערכת הדירוג וההתקדמות
✅ משימות שהושלמו בהצלחה (100% מוכנות)
[x] מנוע חוקי המשחק בשרת ובלקוח (gameRules.js / gameRules.ts): וולידציה קפדנית לכל פעולה (בנייה, אבירים, סחורות, מסחר, קלפים) וכיסוי בדיקות יחידה מקיף (gameRules.test.js ו-server.test.js).

[x] מערכת דירוג והתקדמות שחקן (ratingCalculator.ts / UserContext.tsx):

נוסחת דירוג חדר ייחודית (80/20).

מנגנון שחיקת נקודות (Diminishing Returns) המונע ניצול בוטים קלים.

פרופיל אישי וסטטיסטיקות מפורטות ב-PlayerStatsModal.tsx וסנכרון מלא מול Firebase Auth & Firestore.

📈 8. סטטוס נוכחי והצעדים הבאים
סטטוס נוכחי - אוגוסט 2026
[x] הרחבת "ערים ואבירים" מיושמת ומאינטגרת לחלוטין בסטייט, בלובי, במנוע התורות (useTurnManager.ts), במודלים ה-3D ובבוטים (botReactiveActions.ts).

[x] כל 7 תרחישי יורדי הים (כולל "בגדים לקטאן" ו"איי הפיראטים") ממומשים ומאומתים ב-100%.

[x] בעיית התאימות של ספריית React Three Fiber נפתרה בצורה נקייה באמצעות קובץ התאימות threeTimerCompat.js.

[x] כל בדיקות היחידה (npm test), הבנייה (npm run build) והלינט עוברים בהצלחה ללא שגיאות.

הצעדים הבאים
להרחיב את כיסוי בדיקות ה-E2E עבור זרימות "ערים ואבירים" (התקפת ברברים, נפילת ערים, והפעלת קלפי קידמה נדירים).

לבצע אופטימיזציית ביצועים נוספת ברינדור מודלי ה-3D המורכבים (אבירים, מטרופולין, ספינת ברברים) במכשירים חלשים.

להוסיף תמיכה בהקלטת משחקים (Replay System) לשחזור וניתוח מהלכים של שחקנים ובוטים.