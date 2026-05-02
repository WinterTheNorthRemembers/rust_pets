use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    Born,
    Moved,
    ImmBorrow,
    MutBorrow,
    BorrowEnd,
    Cloned,
    Dropped,
    LifetimeError,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OwnershipEvent {
    pub kind: EventKind,
    pub variable: String,
    pub target: Option<String>,
    pub line: u32,
    pub col: u32,
    pub scope_depth: u32,
    pub type_name: String,
    pub is_mut: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnalysisRequest {
    pub id: String,
    pub file_path: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnalysisResponse {
    pub id: String,
    pub events: Vec<OwnershipEvent>,
    pub error: Option<String>,
}
