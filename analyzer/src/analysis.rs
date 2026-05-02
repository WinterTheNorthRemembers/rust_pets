use ra_ap_syntax::{ast, AstNode, SourceFile, SyntaxKind, Edition};
use ra_ap_line_index::LineIndex;
use crate::events::{EventKind, OwnershipEvent};
use std::panic;

pub fn analyze_source(content: &str) -> Vec<OwnershipEvent> {
    let result = panic::catch_unwind(|| {
        let mut events = Vec::new();
        let parse = SourceFile::parse(content, Edition::Edition2021);
        let file = parse.tree();

        let mut scope_depth = 0;
        let mut active_variables: Vec<(String, u32, String)> = Vec::new(); // (name, depth, type)

        // Helper to get line/col from offset
        let line_index = LineIndex::new(content);

        for node in file.syntax().descendants() {
            match node.kind() {
                SyntaxKind::L_CURLY => {
                    scope_depth += 1;
                }
                SyntaxKind::R_CURLY => {
                    // Check for variables going out of scope
                    let pos = line_index.line_col(node.text_range().start());
                    
                    let (remaining, dropped): (Vec<_>, Vec<_>) = active_variables
                        .into_iter()
                        .partition(|(_, depth, _)| *depth < scope_depth);
                    
                    active_variables = remaining;
                    
                    for (name, _, type_name) in dropped {
                        events.push(OwnershipEvent {
                            kind: EventKind::Dropped,
                            variable: name,
                            target: None,
                            line: pos.line + 1,
                            col: pos.col + 1,
                            scope_depth,
                            type_name,
                            is_mut: false,
                        });
                    }
                    
                    if scope_depth > 0 {
                        scope_depth -= 1;
                    }
                }
                SyntaxKind::LET_STMT => {
                    if let Some(let_stmt) = ast::LetStmt::cast(node.clone()) {
                        if let Some(pat) = let_stmt.pat() {
                            if let Some(name) = pat.syntax().text().to_string().split_whitespace().next() {
                                let pos = line_index.line_col(let_stmt.syntax().text_range().start());
                                
                                // Guess type (very basic)
                                let type_name = if let Some(ty) = let_stmt.ty() {
                                    ty.syntax().text().to_string()
                                } else {
                                    // Guessing from initializer for demo
                                    if let Some(init) = let_stmt.initializer() {
                                        let text = init.syntax().text().to_string();
                                        if text.contains("String") { "String".to_string() }
                                        else if text.parse::<i32>().is_ok() { "i32".to_string() }
                                        else if text.contains("vec!") { "Vec".to_string() }
                                        else { "unknown".to_string() }
                                    } else {
                                        "unknown".to_string()
                                    }
                                };

                                let name_str = name.to_string();
                                active_variables.push((name_str.clone(), scope_depth, type_name.clone()));

                                events.push(OwnershipEvent {
                                    kind: EventKind::Born,
                                    variable: name_str.clone(),
                                    target: None,
                                    line: pos.line + 1,
                                    col: pos.col + 1,
                                    scope_depth,
                                    type_name: type_name.clone(),
                                    is_mut: false,
                                });

                                // Check for move
                                if let Some(init) = let_stmt.initializer() {
                                    if let Some(path_expr) = ast::PathExpr::cast(init.syntax().clone()) {
                                        let target = path_expr.syntax().text().to_string();
                                        // If it's a simple variable name and not a literal
                                        // And if it's NOT a Copy type (for demo purposes)
                                        if !is_copy_type(&type_name) {
                                            events.push(OwnershipEvent {
                                                kind: EventKind::Moved,
                                                variable: target,
                                                target: Some(name_str),
                                                line: pos.line + 1,
                                                col: pos.col + 1,
                                                scope_depth,
                                                type_name,
                                                is_mut: false,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                SyntaxKind::REF_EXPR => {
                    if let Some(ref_expr) = ast::RefExpr::cast(node.clone()) {
                        if let Some(expr) = ref_expr.expr() {
                            let target = expr.syntax().text().to_string();
                            let pos = line_index.line_col(ref_expr.syntax().text_range().start());
                            let kind = if ref_expr.mut_token().is_some() {
                                EventKind::MutBorrow
                            } else {
                                EventKind::ImmBorrow
                            };

                            events.push(OwnershipEvent {
                                kind,
                                variable: target,
                                target: Some("reference".to_string()), // Simplified for now
                                line: pos.line + 1,
                                col: pos.col + 1,
                                scope_depth,
                                type_name: "&T".to_string(),
                                is_mut: ref_expr.mut_token().is_some(),
                            });
                        }
                    }
                }
                _ => {}
            }
        }
        events
    });

    match result {
        Ok(events) => events,
        Err(_) => Vec::new(),
    }
}

fn is_copy_type(ty: &str) -> bool {
    matches!(ty, "i32" | "u32" | "f64" | "i64" | "usize" | "bool" | "char")
}
