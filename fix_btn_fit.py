# Update frontend/index.html
with open("frontend/index.html", "r", encoding="utf-8") as f:
    html = f.read()

old_btn_text = '<span>Proceed to Video Briefing & AI Guidance</span>'
new_btn_text = '<span>Proceed to Video Briefing</span>'

assert old_btn_text in html, "old_btn_text not found in index.html"
html = html.replace(old_btn_text, new_btn_text, 1)

with open("frontend/index.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Updated frontend/index.html with concise button text.")

# Update frontend/styles.css
with open("frontend/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

old_select_css = '''.dropdown-selection-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--bg-card-border);
    padding: 24px;
    border-radius: var(--radius-md);
}

.dropdown-selection-box label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--accent-amber);
    margin-bottom: 12px;
}

.select-action-row {
    display: flex;
    gap: 16px;
    align-items: center;
}

@media (max-width: 768px) {
    .select-action-row {
        flex-direction: column;
        align-items: stretch;
    }
}

.select-action-row select {
    flex: 1;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid var(--bg-card-border);
    padding: 14px 18px;
    border-radius: var(--radius-md);
    color: #fff;
    font-size: 0.95rem;
    outline: none;
}'''

new_select_css = '''.dropdown-selection-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--bg-card-border);
    padding: 22px;
    border-radius: var(--radius-md);
    overflow: hidden;
}

.dropdown-selection-box label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--accent-amber);
    margin-bottom: 12px;
}

.select-action-row {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
}

.select-action-row select {
    flex: 1 1 240px;
    min-width: 0;
    max-width: 100%;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid var(--bg-card-border);
    padding: 13px 16px;
    border-radius: var(--radius-md);
    color: #fff;
    font-size: 0.95rem;
    outline: none;
    box-sizing: border-box;
}

#goToExamBtn {
    flex: 0 1 auto;
    white-space: nowrap;
    padding: 13px 20px;
    font-size: 0.92rem;
    box-sizing: border-box;
}

@media (max-width: 900px) {
    .select-action-row {
        flex-direction: column;
        align-items: stretch;
    }
    .select-action-row select,
    #goToExamBtn {
        width: 100%;
        justify-content: center;
    }
}'''

assert old_select_css in css, "old_select_css not found in styles.css"
css = css.replace(old_select_css, new_select_css, 1)

# Also tune .landing-dashboard-layout for optimal proportion
old_layout_grid = 'grid-template-columns: minmax(0, 1.62fr) minmax(360px, 1fr);'
new_layout_grid = 'grid-template-columns: minmax(0, 1.72fr) minmax(330px, 0.95fr);'

if old_layout_grid in css:
    css = css.replace(old_layout_grid, new_layout_grid, 1)

with open("frontend/styles.css", "w", encoding="utf-8") as f:
    f.write(css)
print("Updated frontend/styles.css successfully.")
