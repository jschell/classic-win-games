#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
                .on_navigation(|url| {
                    (url.scheme() == "https" && url.host_str() == Some("tauri.localhost"))
                        || (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!());
    if let Err(error) = result {
        let message = format!(
            "Classic Win Games could not start.\n\nEnsure Microsoft Edge WebView2 Runtime is installed.\nhttps://developer.microsoft.com/microsoft-edge/webview2/\n\n{error}"
        );
        show_launch_error(&message);
        std::process::exit(1);
    }
}

#[cfg(target_os = "windows")]
fn show_launch_error(message: &str) {
    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(
            window: *mut std::ffi::c_void,
            text: *const u16,
            caption: *const u16,
            flags: u32,
        ) -> i32;
    }
    let text: Vec<u16> = message.encode_utf16().chain(Some(0)).collect();
    let caption: Vec<u16> = "Classic Win Games".encode_utf16().chain(Some(0)).collect();
    // Both strings are NUL-terminated and remain live for the synchronous call.
    unsafe {
        MessageBoxW(std::ptr::null_mut(), text.as_ptr(), caption.as_ptr(), 0x10);
    }
}

#[cfg(not(target_os = "windows"))]
fn show_launch_error(message: &str) {
    eprintln!("{message}");
}
