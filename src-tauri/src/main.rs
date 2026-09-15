#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      db::init_db,
      db::get_plans,
      db::get_athletes,
      db::get_athlete,
      db::create_athlete,
      db::update_athlete_status,
      db::update_athlete,
      db::add_payment,
      db::pay_monthly_plan,
      db::get_athlete_payments,
      db::get_all_payments,
      db::get_products,
      db::create_product,
      db::update_product,
      db::delete_product,
      db::upload_product_image,
      db::get_images_dir,
      db::create_sale,
      db::get_sales,
      db::get_sale_items,
      db::get_athlete_sales,
      db::get_dashboard,
      db::get_expiring_athletes,
      db::get_usd_ves,
      db::set_usd_ves,
      db::get_setting,
      db::set_setting,
      db::log_reminder,
      db::get_pending_reminders,
      db::fetch_bcv_rate,
      db::maybe_auto_fetch_bcv,
      db::delete_athlete,
      db::preview_excel_athletes,
      db::import_athletes_from_excel,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
