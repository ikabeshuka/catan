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
async fn start_oauth_listener() -> Result<String, String> {
    use std::net::TcpListener;
    use std::io::{Read, Write};

    let listener = TcpListener::bind("127.0.0.1:12345").map_err(|e| e.to_string())?;
    let mut id_token = String::new();
    let mut code = String::new();

    for stream in listener.incoming() {
        let mut stream = match stream {
            Ok(s) => s,
            Err(_) => continue,
        };

        let mut buffer = [0; 4096];
        if stream.read(&mut buffer).is_err() {
            continue;
        }

        let request = String::from_utf8_lossy(&buffer);
        if request.starts_with("GET /callback") {
            let response_html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n<!DOCTYPE html>\n<html>\n<head>\n    <title>Authentication Success</title>\n    <style>\n        body {\n            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\n            background-color: #f3f4f6;\n            color: #1f2937;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            height: 100vh;\n            margin: 0;\n        }\n        .container {\n            background-color: #ffffff;\n            padding: 2rem;\n            border-radius: 8px;\n            box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n            text-align: center;\n            max-width: 400px;\n        }\n        h1 {\n            color: #10b981;\n            margin-top: 0;\n        }\n        p {\n            margin-bottom: 0;\n            color: #4b5563;\n        }\n    </style>\n</head>\n<body>\n    <div class=\"container\">\n        <h1>Success!</h1>\n        <p>You may close this tab and return to the game.</p>\n    </div>\n    <script>\n        const hash = window.location.hash;\n        if (hash) {\n            fetch('/submit_token' + hash.replace('#', '?'))\n                .then(() => { console.log('Token submitted successfully'); })\n                .catch(err => { console.error('Error submitting token', err); });\n        } else {\n            const search = window.location.search;\n            if (search) {\n                fetch('/submit_token' + search)\n                    .then(() => { console.log('Token/code submitted successfully'); })\n                    .catch(err => { console.error('Error submitting token/code', err); });\n            }\n        }\n    </script>\n</body>\n</html>";
            let _ = stream.write_all(response_html.as_bytes());
            let _ = stream.flush();
        } else if request.starts_with("GET /submit_token") {
            let first_line = request.lines().next().unwrap_or("");
            if let Some(token_param) = first_line.split_whitespace().nth(1) {
                let query = token_param.split('?').nth(1).unwrap_or("");
                for pair in query.split('&') {
                    let mut parts = pair.split('=');
                    if let (Some(key), Some(val)) = (parts.next(), parts.next()) {
                        if key == "id_token" {
                            id_token = val.to_string();
                        } else if key == "code" {
                            code = val.to_string();
                        }
                    }
                }
            }

            let ok_response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\nOK";
            let _ = stream.write_all(ok_response.as_bytes());
            let _ = stream.flush();

            if !id_token.is_empty() || !code.is_empty() {
                break;
            }
        } else {
            let not_found = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(not_found.as_bytes());
            let _ = stream.flush();
        }
    }

    if !id_token.is_empty() {
        Ok(format!("id_token:{}", id_token))
    } else if !code.is_empty() {
        Ok(format!("code:{}", code))
    } else {
        Err("No credentials received".to_string())
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
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client.get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?
        .error_for_status()
        .map_err(|e| format!("HTTP request failed with error status: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    let min_size = 5 * 1024 * 1024; // 5 MB in bytes
    if bytes.len() < min_size {
        return Err(format!(
            "Downloaded file size ({} bytes) is too small (minimum required is {} bytes). The file may be corrupt or an HTML error page.",
            bytes.len(),
            min_size
        ));
    }

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
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
        set_update_downloading,
        check_is_portable,
        update_portable_app,
        start_oauth_listener
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
