#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      db::init_db,
      db::get_plans,
      db::get_athletes,
      db::get_athlete,
      db::create_athlete,
      db::update_athlete_status,
      db::add_payment,
      db::get_products,
      db::create_product,
      db::create_sale,
      db::get_sales,
      db::get_sale_items,
      db::get_athlete_sales,
      db::get_dashboard,
      db::get_usd_ves,
      db::set_usd_ves,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
