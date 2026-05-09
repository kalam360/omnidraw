//! Auth-related Tauri commands.
//!
//! For S10 the device-flow itself runs entirely in the renderer (it talks
//! to Omnizen via `fetch`, opens the verification URL via the
//! `tauri-plugin-shell` JS API, and stores the resulting key via
//! `tauri-plugin-keyring`'s JS API). We expose a small `auth_ping` command
//! purely so the renderer can confirm it is running inside Tauri rather
//! than the SPA dev server before deciding which `KeyStore` to construct.
//!
//! v0.2 will wrap a richer device-flow runner in Rust so the renderer can
//! delegate the polling loop and we can avoid keeping the OAuth refresh
//! token in the renderer process.

use serde::Serialize;

#[derive(Serialize)]
pub struct AuthPing {
    pub ok: bool,
    pub runtime: &'static str,
}

#[tauri::command]
pub fn auth_ping() -> AuthPing {
    AuthPing {
        ok: true,
        runtime: "tauri",
    }
}
