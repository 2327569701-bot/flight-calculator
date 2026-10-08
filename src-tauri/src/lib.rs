use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

const CHARTFOX_URL: &str = "https://chartfox.org/";

#[derive(Default)]
struct WeatherCache(Mutex<HashMap<String, (Instant, serde_json::Value)>>);

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
    fs::create_dir_all(profiles_dir.join("aircraft")).ok();
    fs::create_dir_all(profiles_dir.join("units")).ok();
    profiles_dir
}

#[tauri::command]
fn save_aircraft_preset(name: String, config: serde_json::Value) -> Result<String, String> {
    if config.to_string().len() > 65_536 { return Err("档案内容过大".into()); }
    let profiles_dir = ensure_profiles_dir();
    let filename = profile_filename(&name)?;
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
fn list_aircraft_presets() -> Vec<serde_json::Value> {
    list_presets("aircraft")
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
                            "key": entry.path().file_stem().unwrap_or_default().to_string_lossy(),
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
    validate_preset_type(&preset_type)?;
    let profiles_dir = get_profiles_dir();
    let filename = profile_filename(&name)?;
    let file_path = profiles_dir
        .join(&preset_type)
        .join(format!("{}.json", filename));
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_preset(preset_type: String, name: String) -> Result<(), String> {
    validate_preset_type(&preset_type)?;
    let profiles_dir = get_profiles_dir();
    let filename = profile_filename(&name)?;
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
    let aircraft = read_presets("aircraft")?;
    let units = read_presets("units")?;
    Ok(serde_json::json!({
        "exportedAt": chrono_now(),
        "format": "flight-calculator-profiles",
        "version": 1,
        "aircraft": aircraft,
        "units": units
    }))
}

fn read_presets(subdir: &str) -> Result<Vec<PresetData>, String> {
    let dir = get_profiles_dir().join(subdir);
    if !dir.exists() { return Ok(Vec::new()); }
    let mut presets = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().is_some_and(|extension| extension == "json") {
            let content = fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
            presets.push(serde_json::from_str(&content).map_err(|e| e.to_string())?);
        }
    }
    Ok(presets)
}

#[tauri::command]
fn import_all(data: serde_json::Value) -> Result<usize, String> {
    if data["format"] != "flight-calculator-profiles" || data["version"] != 1 {
        return Err("不支持的档案备份格式".into());
    }
    let root = ensure_profiles_dir();
    let mut files = Vec::new();
    for subdir in ["aircraft", "units"] {
        let items = data[subdir].as_array().ok_or("档案列表格式无效")?;
        if items.len() > 100 { return Err("档案数量超过限制".into()); }
        for item in items {
            let preset: PresetData = serde_json::from_value(item.clone()).map_err(|e| e.to_string())?;
            if preset.config.to_string().len() > 65_536 { return Err("档案内容过大".into()); }
            let filename = profile_filename(&preset.name)?;
            let target = root.join(subdir).join(format!("{}.json", filename));
            let content = serde_json::to_string_pretty(&preset).map_err(|e| e.to_string())?;
            files.push((target, content));
        }
    }
    let count = files.len();
    for (path, content) in files { fs::write(path, content).map_err(|e| e.to_string())?; }
    Ok(count)
}

// The ChartFox page uses a separate webview without application permissions.
#[tauri::command]
async fn open_chartfox_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("chartfox") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let profile_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("chartfox-webview");
    fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    let url = tauri::Url::parse(CHARTFOX_URL).map_err(|e| e.to_string())?;
    let window =
        tauri::WebviewWindowBuilder::new(&app, "chartfox", tauri::WebviewUrl::External(url))
            .title("ChartFox 航图 | 飞行计算器")
            .inner_size(1120.0, 780.0)
            .min_inner_size(760.0, 540.0)
            .center()
            .data_directory(profile_dir)
            .build()
            .map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn dock_chartfox_window(app: tauri::AppHandle) -> Result<(), String> {
    open_chartfox_window(app.clone()).await?;
    let main = app.get_webview_window("main").ok_or("主窗口不可用")?;
    let chart = app.get_webview_window("chartfox").ok_or("航图窗口不可用")?;
    let monitor = main.current_monitor().map_err(|e| e.to_string())?.ok_or("无法读取显示器")?;
    let bounds = monitor.size();
    if bounds.width < 1750 || bounds.height < 700 {
        return Err("当前显示器空间不足，请手动并排摆放窗口".into());
    }
    let left = monitor.position().x + 20;
    let top = monitor.position().y + 34;
    let usable_width = bounds.width - 52;
    let height = (bounds.height - 110).min(980);
    let main_width = (usable_width as f64 * 0.52) as u32;
    let chart_width = usable_width - main_width - 12;
    main.set_size(tauri::PhysicalSize::new(main_width, height)).map_err(|e| e.to_string())?;
    main.set_position(tauri::PhysicalPosition::new(left, top)).map_err(|e| e.to_string())?;
    chart.set_size(tauri::PhysicalSize::new(chart_width, height)).map_err(|e| e.to_string())?;
    chart.set_position(tauri::PhysicalPosition::new(left + main_width as i32 + 12, top)).map_err(|e| e.to_string())?;
    chart.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn fetch_metar(station: String, cache: tauri::State<'_, WeatherCache>) -> Result<serde_json::Value, String> {
    let station = station.trim().to_ascii_uppercase();
    if station.len() != 4 || !station.bytes().all(|byte| byte.is_ascii_uppercase()) {
        return Err("机场 ICAO 代码须为四个英文字母".into());
    }
    if let Ok(guard) = cache.0.lock() {
        if let Some((fetched, value)) = guard.get(&station) {
            if fetched.elapsed() < Duration::from_secs(600) { return Ok(value.clone()); }
        }
    }
    let url = format!("https://aviationweather.gov/api/data/metar?ids={station}&format=json");
    let client = reqwest::Client::builder()
        .user_agent("FlightCalculator/4.0 (flight simulation; single-station requests)")
        .timeout(Duration::from_secs(10))
        .build().map_err(|e| e.to_string())?;
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    if response.status() == reqwest::StatusCode::NO_CONTENT {
        return Err("该机场暂无近期 METAR".into());
    }
    let response = response.error_for_status().map_err(|e| e.to_string())?;
    let reports: Vec<serde_json::Value> = response.json().await.map_err(|e| e.to_string())?;
    let report = reports.into_iter().find(|value| value["icaoId"] == station)
        .ok_or_else(|| "该机场暂无 METAR".to_string())?;
    if let Ok(mut guard) = cache.0.lock() {
        guard.insert(station, (Instant::now(), report.clone()));
    }
    Ok(report)
}

#[tauri::command]
fn open_chartfox_browser() -> Result<(), String> {
    open::that(CHARTFOX_URL).map_err(|e| e.to_string())
}

fn validate_preset_type(kind: &str) -> Result<(), String> {
    if kind == "aircraft" || kind == "units" { Ok(()) }
    else { Err("档案类型无效".into()) }
}

fn profile_filename(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.chars().count() > 40 ||
        !trimmed.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == ' ') {
        return Err("档案名称须为 1–40 字的字母、数字、空格、连字符或下划线".into());
    }
    let upper = trimmed.to_ascii_uppercase();
    let reserved_port = (upper.starts_with("COM") || upper.starts_with("LPT")) &&
        upper.len() == 4 && upper.as_bytes()[3].is_ascii_digit() && upper.as_bytes()[3] != b'0';
    if ["CON", "PRN", "AUX", "NUL"].contains(&upper.as_str()) || reserved_port {
        return Err("档案名称为 Windows 保留名称".into());
    }
    Ok(trimmed.to_string())
}

fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_paths_reject_escape_and_reserved_names() {
        for name in ["", "..", "../other", "CON", "COM1", "COM9", "LPT9", "bad/name"] {
            assert!(profile_filename(name).is_err(), "{name}");
        }
        assert_eq!(profile_filename("A320 Neo").unwrap(), "A320 Neo");
        assert!(validate_preset_type("aircraft").is_ok());
        assert!(validate_preset_type("../aircraft").is_err());
    }

    #[test]
    fn timestamps_use_real_calendar_dates() {
        assert!(chrono::DateTime::parse_from_rfc3339(&chrono_now()).is_ok());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WeatherCache::default())
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
            list_aircraft_presets,
            load_preset,
            delete_preset,
            export_all,
            import_all,
            open_chartfox_window,
            dock_chartfox_window,
            open_chartfox_browser,
            fetch_metar,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
