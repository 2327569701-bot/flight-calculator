use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct PresetData {
    pub name: String,
    pub config: serde_json::Value,
    pub saved_at: String,
}

fn get_profiles_dir() -> PathBuf {
    let data_dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    data_dir.join("flight-calculator").join("profiles")
}

fn ensure_profiles_dir() -> PathBuf {
    let profiles_dir = get_profiles_dir();
    if !profiles_dir.exists() {
        fs::create_dir_all(&profiles_dir).ok();
        fs::create_dir_all(profiles_dir.join("aircraft")).ok();
        fs::create_dir_all(profiles_dir.join("units")).ok();
    }
    profiles_dir
}

#[tauri::command]
fn save_aircraft_preset(name: String, config: serde_json::Value) -> Result<String, String> {
    let profiles_dir = ensure_profiles_dir();
    let filename = sanitize_filename(&name);
    let file_path = profiles_dir.join("aircraft").join(format!("{}.json", filename));
    let data = PresetData {
        name: name.clone(),
        config,
        saved_at: chrono_now(),
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn save_unit_preset(name: String, config: serde_json::Value) -> Result<String, String> {
    let profiles_dir = ensure_profiles_dir();
    let filename = sanitize_filename(&name);
    let file_path = profiles_dir.join("units").join(format!("{}.json", filename));
    let data = PresetData {
        name: name.clone(),
        config,
        saved_at: chrono_now(),
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn list_aircraft_presets() -> Vec<serde_json::Value> {
    list_presets("aircraft")
}

#[tauri::command]
fn list_unit_presets() -> Vec<serde_json::Value> {
    list_presets("units")
}

fn list_presets(subdir: &str) -> Vec<serde_json::Value> {
    let profiles_dir = get_profiles_dir();
    let dir = profiles_dir.join(subdir);
    if !dir.exists() {
        return vec![];
    }
    let mut presets = vec![];
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if entry.path().extension().map_or(false, |e| e == "json") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    if let Ok(data) = serde_json::from_str::<PresetData>(&content) {
                        presets.push(serde_json::json!({
                            "name": data.name,
                            "key": entry.file_stem().unwrap_or_default().to_string_lossy(),
                            "savedAt": data.saved_at
                        }));
                    }
                }
            }
        }
    }
    presets.sort_by(|a, b| {
        let a_time = a["savedAt"].as_str().unwrap_or("");
        let b_time = b["savedAt"].as_str().unwrap_or("");
        b_time.cmp(a_time)
    });
    presets
}

#[tauri::command]
fn load_preset(preset_type: String, name: String) -> Result<PresetData, String> {
    let profiles_dir = get_profiles_dir();
    let filename = sanitize_filename(&name);
    let file_path = profiles_dir
        .join(&preset_type)
        .join(format!("{}.json", filename));
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_preset(preset_type: String, name: String) -> Result<(), String> {
    let profiles_dir = get_profiles_dir();
    let filename = sanitize_filename(&name);
    let file_path = profiles_dir
        .join(&preset_type)
        .join(format!("{}.json", filename));
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn export_all() -> Result<serde_json::Value, String> {
    let aircraft = list_presets("aircraft");
    let units = list_presets("units");
    Ok(serde_json::json!({
        "exportedAt": chrono_now(),
        "version": "1.0",
        "aircraft": aircraft,
        "units": units
    }))
}

#[tauri::command]
fn open_profiles_folder() -> Result<String, String> {
    let profiles_dir = ensure_profiles_dir();
    open::that(&profiles_dir).map_err(|e| e.to_string())?;
    Ok(profiles_dir.to_string_lossy().to_string())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
        .take(50)
        .collect()
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let days = secs / 86400;
    let years = days / 365 + 1970;
    let remaining_days = days % 365;
    let months = remaining_days / 30;
    let day = remaining_days % 30;
    format!(
        "{:04}-{:02}-{:02}T00:00:00Z",
        years,
        months.min(12) + 1,
        day + 1
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            ensure_profiles_dir();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_aircraft_preset,
            save_unit_preset,
            list_aircraft_presets,
            list_unit_presets,
            load_preset,
            delete_preset,
            export_all,
            open_profiles_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}