const Database = require('better-sqlite3');
const path = require('path');

// שים לב שהנתיב לקובץ ה-DB תואם לשלך (למשל kinetic.db)
const dbPath = path.join(__dirname, 'kinetic.db'); 
const db = new Database(dbPath);

try {
    console.log('🚀 מתחיל מיגרציה: מוסיף user_id לטבלת nutrition_logs...');
    
    // פקודת ה-ALTER TABLE שמוסיפה את העמודה
    db.prepare('ALTER TABLE nutrition_logs ADD COLUMN user_id INTEGER').run();
    
    console.log('✅ המיגרציה עברה בהצלחה! העמודה user_id התווספה.');
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('⚠️ העמודה user_id כבר קיימת בטבלה. אין צורך בשינוי.');
    } else {
        console.error('❌ שגיאה במיגרציה:', err);
    }
} finally {
    db.close();
}