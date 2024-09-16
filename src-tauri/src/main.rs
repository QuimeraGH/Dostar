// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, fs::create_dir_all, path::PathBuf};
use rusqlite::{ffi::Error, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Task {
    id: i64,
    description: String,
    date: String,
    completed: bool
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_tasks_call
            ,toggle_task_call
            ,add_task_call
            ,delete_task_call])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_path_initialized() -> Result<PathBuf, Error> {
    let appdata = env::var("LOCALAPPDATA").unwrap_or_else(|_| String::from(""));
    let mut app_dir = PathBuf::from(appdata);
    app_dir.push("Dostar");

    if !app_dir.exists() {
        create_dir_all(&app_dir).unwrap();
    }

    let filepath = app_dir.join("tasksdata.db");

    Ok(filepath)

}

fn get_connection_initialized() -> Result<Connection, i8> {
    let path = match get_path_initialized() {
        Ok(path) => path,
        Err(_) => return Err(1),
    };

    match Connection::open(path) {
        Ok(conn) => return Ok(conn),
        Err(_) => return Err(1)
    };
}

#[tauri::command]
async fn get_tasks_call() -> Vec<Task> {

    let conn = get_connection_initialized().unwrap();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS taskstable  (
            id    INTEGER NOT NULL,
            description  TEXT NOT NULL,
            date  TEXT NOT NULL,
            completed INTEGER NOT NULL
        )",
        (),
    ).unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, description, date, completed FROM taskstable"
    ).unwrap();
    let tasks_iter = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            description: row.get(1)?,
            date: row.get(2)?,
            completed: row.get::<_, i64>(3)? != 0
        })
    }).unwrap();

    let mut tasks_returned = Vec::new();

    for task in tasks_iter {
        tasks_returned.push(task.unwrap());
    }

    tasks_returned

}

#[tauri::command]
async fn toggle_task_call(id: i64, completedfinal: bool) -> Result<i8, i8> {

    let conn = match get_connection_initialized() {
        Ok(conn) => conn,
        Err(_) => return Err(1)
    };

    match conn.execute(
        "UPDATE taskstable
            SET completed = ?1
            WHERE id == ?2
        ",(if completedfinal { 1 } else { 0 }, id)
    ) {
        Ok(_) => return Ok(0),
        Err(_) => return Err(1)
    }

}

#[tauri::command(rename_all = "snake_case")]
async fn add_task_call(new_task: Task) -> Result<i8, i8> {

    let conn = match get_connection_initialized() {
        Ok(conn) => conn,
        Err(_) => return Err(1)
    };

    match conn.execute(
        "INSERT INTO taskstable(id, description, date, completed) VALUES(?1, ?2, ?3, ?4)
    ",(
        new_task.id as i64,
        new_task.description,
        new_task.date,
        if new_task.completed {1} else {0})) {
            Ok(_) => return Ok(0),
            Err(_) => return Err(1)
        }
}

#[tauri::command]
async fn delete_task_call(id: i64) -> Result<i8, i8>{
    let conn = match get_connection_initialized() {
        Ok(conn) => conn,
        Err(_) => return Err(1)
    };

    match conn.execute(
        "DELETE FROM taskstable
            WHERE id == ?1
        ",(id,)) {
            Ok(_) => return Ok(0),
            Err(_) => return Err(1)
        }
}