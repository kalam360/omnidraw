//! Omnidraw desktop entry point.
//!
//! Wires the Tauri 2 builder with the two MVP plugins:
//!   * `tauri-plugin-shell` — used by the OAuth/device-flow auth path to
//!     open the user's default browser (`shell:allow-open`).
//!   * `tauri-plugin-keyring` — used by the auth keychain to persist the
//!     Omnizen API key in the OS-native credential store (Keychain on
//!     macOS, Credential Manager on Windows, Secret Service on Linux).
//!
//! Storage IPC for the SQLite adapter is deferred to v0.2 — the SPA
//! continues to use the in-memory `browser-storage` adapter under Tauri
//! v0.1 so the desktop launches without further plumbing.

mod auth;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_keyring::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![auth::auth_ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
