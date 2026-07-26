import React, { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';

export const UpdateNotification: React.FC = () => {
  useEffect(() => {
    const handleSilentUpdate = async () => {
      try {
        // בדיקה מול ה-Endpoint שמוגדר ב-tauri.conf.json
        const update = await check();
        
        if (update?.available) {
          console.log(`🎉 נמצאה גרסה חדשה (${update.version}). מתחיל הורדה והתקנה שקטה ברקע...`);
          
          // הורדה והתקנה שקטה ברקע - העדכון יוחל אוטומטית בסגירה ופתיחה מחדש של האפליקציה
          await update.downloadAndInstall();
          
          console.log('✅ העדכון הורד והותקן בהצלחה ברקע. הוא יוחל בהפעלה הבאה של המשחק.');
        }
      } catch (error) {
        console.log('בדיקת עדכונים מושהית בסביבת פיתוח מקומית:', error);
      }
    };

    handleSilentUpdate();
  }, []);

  // רכיב שקט ללא רכיבים ויזואליים (פועל ברקע בלבד)
  return null;
};