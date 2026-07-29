use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 1. יצירת פריטי תפריט למגש המערכת (System Tray)
      let show_item = MenuItem::with_id(app, "show", "פתח אפליקציה", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "יציאה לחלוטין", true, None::<&str>)?;
      let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

      // 2. הגדרת האייקון במגש המערכת והתנהגות הלחיצות
      if let Some(icon) = app.default_window_icon() {
          TrayIconBuilder::new()
              .icon(icon.clone())
              .menu(&tray_menu)
              .on_menu_event(|app_handle, event| match event.id.as_ref() {
                  "show" => {
                      if let Some(window) = app_handle.get_webview_window("main") {
                          let _ = window.show();
                          let _ = window.set_focus();
                      }
                  }
                  "quit" => {
                      app_handle.exit(0);
                  }
                  _ => {}
              })
              .build(app)?;
      }

      Ok(())
    })
    // 3. לכידת אירוע הסגירה (לחיצה על X) והסתרה ברקע
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}