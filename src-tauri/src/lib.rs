use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use std::sync::atomic::{AtomicBool, Ordering};

struct DownloadState(AtomicBool);

#[tauri::command]
fn set_update_downloading(app: tauri::AppHandle, state: tauri::State<'_, DownloadState>, downloading: bool) {
    state.0.store(downloading, Ordering::SeqCst);
    if !downloading {
        if let Some(window) = app.get_webview_window("main") {
            if matches!(window.is_visible(), Ok(false)) {
                app.exit(0);
            }
        }
    }
}

#[tauri::command]
fn check_is_portable() -> bool {
    if let Ok(exe_path) = std::env::current_exe() {
        let path_str = exe_path.to_string_lossy().to_lowercase();
        let is_in_program_files = path_str.contains("program files") || path_str.contains("programfiles");
        let is_in_appdata = path_str.contains("appdata") || path_str.contains("application data");
        !(is_in_program_files || is_in_appdata)
    } else {
        true
    }
}

#[tauri::command]
async fn update_portable_app(app: tauri::AppHandle, download_url: String) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| format!("Failed to get current exe path: {}", e))?;
    let current_dir = current_exe.parent().ok_or("Failed to get parent directory of current exe")?;
    let exe_name = current_exe.file_name().ok_or("Failed to get current exe file name")?;

    let new_exe = current_dir.join(format!("{}.new", exe_name.to_string_lossy()));
    let old_exe = current_dir.join(format!("{}.old", exe_name.to_string_lossy()));

    // 1. Download target binary to .new
    let response = reqwest::get(&download_url)
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;
    std::fs::write(&new_exe, &bytes)
        .map_err(|e| format!("Failed to write to file {}: {}", new_exe.display(), e))?;

    // 2. Clear old .old if exists
    if old_exe.exists() {
        let _ = std::fs::remove_file(&old_exe);
    }

    // 3. Rename current running exe to .old, and rename .new to current exe
    std::fs::rename(&current_exe, &old_exe)
        .map_err(|e| format!("Failed to rename running exe to .old: {}", e))?;
    std::fs::rename(&new_exe, &current_exe)
        .map_err(|e| format!("Failed to rename .new to current exe: {}", e))?;

    // 4. Detached background process to cleanup and restart
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let script = format!(
            "Start-Sleep -Seconds 1.5; Remove-Item -Path '{}' -Force; Start-Process -FilePath '{}'",
            old_exe.to_string_lossy(),
            current_exe.to_string_lossy()
        );

        std::process::Command::new("powershell")
            .args(&["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("Failed to spawn background PowerShell script: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let script = format!(
            "sleep 1.5 && rm -f '{}' && open '{}'",
            old_exe.to_string_lossy(),
            current_exe.to_string_lossy()
        );
        std::process::Command::new("sh")
            .arg("-c")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to spawn background shell script: {}", e))?;
    }

    // Terminate current app to release file locks
    app.exit(0);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(DownloadState(AtomicBool::new(false)))
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
        set_update_downloading,
        check_is_portable,
        update_portable_app
    ])
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
        let is_downloading = window.state::<DownloadState>().0.load(Ordering::SeqCst);
        if is_downloading {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
