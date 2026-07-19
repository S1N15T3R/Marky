// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use tauri::Manager;

mod commands;

// Single-instance guard. We create an atomic lock *directory* in the app config
// dir — `create_dir` is atomic on every OS and fails if it already exists, so
// it's a reliable cross-platform mutex without extra crates. If acquisition
// fails, another instance is alive and we bring it to front and exit.
fn acquire_single_instance(app: &tauri::AppHandle) -> bool {
    let dir = match app.path().app_config_dir() {
        Ok(d) => d,
        Err(_) => return true, // can't check — allow (dev)
    };
    let _ = fs::create_dir_all(&dir);
    let lock = dir.join(".marky-instance");

    // If a stale lock exists, remove it first (best effort).
    if lock.exists() {
        let _ = fs::remove_dir_all(&lock);
    }
    match fs::create_dir(&lock) {
        Ok(_) => {
            // Stash our PID inside for diagnostics / cleanup.
            let _ = fs::write(lock.join("pid"), std::process::id().to_string());
            true
        }
        Err(_) => false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sql::Builder::default().build());

    // The updater plugin requires network + a pubkey; only include in release.
    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            if !acquire_single_instance(app.handle()) {
                // Another instance is running — bring it to front if possible.
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                    let _ = win.unminimize();
                }
                std::process::exit(0);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::read_dir,
            commands::file_exists,
            commands::export_html,
            commands::export_pdf,
            commands::app_data_dir,
            commands::open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Marky");
}

fn main() {
    run();
}
