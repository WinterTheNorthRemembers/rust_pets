#![deny(clippy::unwrap_used)]

mod events;
mod analysis;

use std::io::{self, BufRead, Write};
use crate::events::{AnalysisRequest, AnalysisResponse};
use crate::analysis::analyze_source;

fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: AnalysisRequest = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                let response = AnalysisResponse {
                    id: "unknown".to_string(),
                    events: vec![],
                    error: Some(format!("Failed to parse request: {}", e)),
                };
                let json = serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string());
                writeln!(stdout, "{}", json)?;
                stdout.flush()?;
                continue;
            }
        };

        let events = analyze_source(&request.content);

        let response = AnalysisResponse {
            id: request.id,
            events,
            error: None,
        };

        if let Ok(json) = serde_json::to_string(&response) {
            writeln!(stdout, "{}", json)?;
            stdout.flush()?;
        }
    }

    Ok(())
}
