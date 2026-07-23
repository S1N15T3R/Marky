use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
  fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
  // Ensure parent directory exists before writing.
  if let Some(parent) = PathBuf::from(&path).parent() {
    if !parent.as_os_str().is_empty() {
      let _ = fs::create_dir_all(parent);
    }
  }
  fs::write(&path, contents).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
  PathBuf::from(&path).exists()
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct FileNode {
  pub name: String,
  pub path: String,
  #[serde(rename = "isDir")]
  pub is_dir: bool,
  pub children: Option<Vec<FileNode>>,
}

// Recursively list a directory, limiting depth to keep large trees tractable.
#[tauri::command]
pub fn read_dir(path: String, depth: Option<u32>) -> Result<Vec<FileNode>, String> {
  let depth = depth.unwrap_or(4);
  fn walk(dir: &PathBuf, depth: u32) -> Vec<FileNode> {
    let mut out = Vec::new();
    let entries = match fs::read_dir(dir) {
      Ok(e) => e,
      Err(_) => return out,
    };
    for entry in entries.flatten() {
      let p = entry.path();
      let name = entry.file_name().to_string_lossy().to_string();
      let is_dir = p.is_dir();
      if name.starts_with('.') || name == "node_modules" || name == "target" {
        continue;
      }
      let node = if is_dir && depth > 0 {
        FileNode {
          name,
          path: p.to_string_lossy().to_string(),
          is_dir,
          children: Some(walk(&p, depth - 1)),
        }
      } else {
        FileNode {
          name,
          path: p.to_string_lossy().to_string(),
          is_dir,
          children: None,
        }
      };
      out.push(node);
    }
    out.sort_by(|a, b| {
      if a.is_dir != b.is_dir {
        return b.is_dir.cmp(&a.is_dir); // dirs first
      }
      a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });
    out
  }
  Ok(walk(&PathBuf::from(path), depth))
}

#[tauri::command]
pub fn app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
  app.path()
    .app_data_dir()
    .map(|p| p.to_string_lossy().to_string())
    .map_err(|e| format!("No app data dir: {}", e))
}

// Export rendered HTML to a file on disk.
#[tauri::command]
pub fn export_html(path: String, html: String) -> Result<(), String> {
  if let Some(parent) = PathBuf::from(&path).parent() {
    if !parent.as_os_str().is_empty() {
      let _ = fs::create_dir_all(parent);
    }
  }
  fs::write(&path, html).map_err(|e| format!("Failed to export HTML: {}", e))
}

// Export PDF: the frontend renders a print-friendly page and triggers the OS
// print dialog (Save as PDF). The Rust side stores the HTML payload so it can
// be re-opened if needed.
#[tauri::command]
pub fn export_pdf(path: String, html: String) -> Result<(), String> {
  if let Some(parent) = PathBuf::from(&path).parent() {
    if !parent.as_os_str().is_empty() {
      let _ = fs::create_dir_all(parent);
    }
  }
  fs::write(&path, html).map_err(|e| format!("Failed to export PDF: {}", e))
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
  // Frontend opens URLs via the opener plugin directly; this command is a
  // no-op bridge retained for API completeness.
  if url.is_empty() {
    return Err("empty url".into());
  }
  Ok(())
}
