#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      db::init_db,
      db::get_accounts,
      db::get_transactions,
      db::add_transaction,
      db::delete_transaction,
      db::create_account,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
