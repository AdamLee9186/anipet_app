.\start-app.ps1

# הוראות הפעלה - אפליקציית חנות חיות

## איך להפעיל את האפליקציה במחשב חדש

### דרישות מקדימות:
1. **Node.js** - גרסה 16.x ומעלה
   - הורד מ: https://nodejs.org/
   - בחר בגרסה היציבה (LTS)
2. **חיבור לאינטרנט** - נדרש להתקנת חבילות

### שלבי הפעלה:

#### שלב 1: הורדת הפרויקט
- הורד את כל קבצי הפרויקט לתיקייה במחשב
- וודא שכל הקבצים נמצאים (כולל תיקיית `public/data`)

#### שלב 2: הפעלת הסקריפט
יש שתי דרכים להפעיל את הסקריפט:

**אפשרות א': כפול על הקובץ**
- מצא את הקובץ `start-app.bat` בתיקיית הפרויקט
- לחץ עליו פעמיים (double-click)
- הסקריפט יפתח חלון פקודה ויבדוק הכל אוטומטית

**אפשרות ב': דרך חלון פקודה**
- פתח חלון פקודה (Command Prompt)
- נווט לתיקיית הפרויקט: `cd "נתיב\לתיקיית\הפרויקט"`
- הרץ: `start-app.bat`

### מה הסקריפט עושה:

1. **בודק חיבור לאינטרנט** - וודא שיש חיבור
2. **בודק Node.js** - מוודא שמותקן גרסה מתאימה
3. **בודק npm** - מוודא שמותקן
4. **בודק קבצי נתונים** - מוודא שכל הקבצים הנדרשים קיימים
5. **מתקין חבילות frontend** - אם לא מותקנות
6. **מתקין חבילות backend** - אם לא מותקנות
7. **מתחיל את השרתים** - backend בפורט 5000, frontend בפורט 3000

### מה קורה אחרי הפעלה:

- האפליקציה תפתח אוטומטית בדפדפן בכתובת: `http://localhost:3000`
- שרת ה-backend יפעל בכתובת: `http://localhost:5000`
- כדי לעצור את האפליקציה, לחץ `Ctrl+C` בחלון הפקודה

### פתרון בעיות נפוצות:

**❌ Node.js לא מותקן:**
- הורד והתקן Node.js מ: https://nodejs.org/
- סגור ופתח מחדש את חלון הפקודה

**❌ אין חיבור לאינטרנט:**
- בדוק את חיבור האינטרנט
- נסה שוב

**❌ קבצי נתונים חסרים:**
- וודא שכל הקבצים בתיקיית `public/data` קיימים
- פנה למנהל הפרויקט

**❌ שגיאות הרשאה:**
- הרץ את הסקריפט כמנהל מערכת (Run as Administrator)

**❌ פורטים תפוסים:**
- הסקריפט ינסה לשחרר את הפורטים אוטומטית
- אם זה לא עובד, סגור תוכנות אחרות שמשתמשות בפורטים 3000 או 5000

### תמיכה:
אם יש בעיות, פנה למנהל הפרויקט עם:
- הודעת השגיאה המדויקת
- גרסת Windows
- גרסת Node.js
- תיאור מה קרה

---

# Startup Instructions - Pet Store App

## How to run the app on a new computer

### Prerequisites:
1. **Node.js** - version 16.x or higher
   - Download from: https://nodejs.org/
   - Choose the LTS version
2. **Internet connection** - required for package installation

### Steps:

#### Step 1: Download the project
- Download all project files to a folder on your computer
- Ensure all files are present (including `public/data` folder)

#### Step 2: Run the script
Two ways to run the script:

**Option A: Double-click the file**
- Find `start-app.bat` in the project folder
- Double-click it
- The script will open a command window and check everything automatically

**Option B: Via command prompt**
- Open Command Prompt
- Navigate to project folder: `cd "path\to\project\folder"`
- Run: `start-app.bat`

### What the script does:

1. **Checks internet connection** - ensures connectivity
2. **Checks Node.js** - verifies correct version is installed
3. **Checks npm** - verifies it's installed
4. **Checks data files** - ensures all required files exist
5. **Installs frontend packages** - if not installed
6. **Installs backend packages** - if not installed
7. **Starts servers** - backend on port 5000, frontend on port 3000

### After startup:

- App will open automatically in browser at: `http://localhost:3000`
- Backend server runs at: `http://localhost:5000`
- To stop the app, press `Ctrl+C` in the command window

### Troubleshooting:

**❌ Node.js not installed:**
- Download and install Node.js from: https://nodejs.org/
- Close and reopen command window

**❌ No internet connection:**
- Check internet connection
- Try again

**❌ Missing data files:**
- Ensure all files in `public/data` folder exist
- Contact project administrator

**❌ Permission errors:**
- Run script as Administrator

**❌ Ports in use:**
- Script will try to free ports automatically
- If that doesn't work, close other programs using ports 3000 or 5000

### Support:
If you have issues, contact the project administrator with:
- Exact error message
- Windows version
- Node.js version
- Description of what happened 