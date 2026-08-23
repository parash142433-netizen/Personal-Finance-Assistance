# Directive: Bundle Standalone Mobile HTML

## Goal
Bundle all frontend assets (`index.html`, `styles.css`, `app.js`) into a single self-contained `ledgr-mobile.html` file that can be opened standalone on mobile devices without any external local file dependencies.

## Inputs
- `index.html` (Main layout & page templates)
- `styles.css` (Stylesheet & responsive rules)
- `app.js` (Application state, navigation, data, Chart.js logic)

## Execution Tool
- `execution/bundle_standalone_html.py`

## Usage
```bash
python execution/bundle_standalone_html.py
```

## Output
- `ledgr-mobile.html` in workspace root.

## Edge Cases & Considerations
- Chart.js is loaded via CDN (`jsdelivr.net`), requiring internet access on the mobile device for chart rendering.
- All styles and logic are inlined into `<style>` and `<script>` tags respectively.
