"""
Bundle index.html, styles.css, and app.js into a single standalone HTML file.
"""
from pathlib import Path

def bundle():
    base_dir = Path(__file__).parent.parent
    index_path = base_dir / "index.html"
    css_path = base_dir / "styles.css"
    js_path = base_dir / "app.js"
    output_path = base_dir / "ledgr-mobile.html"

    index_content = index_path.read_text(encoding="utf-8")
    css_content = css_path.read_text(encoding="utf-8")
    js_content = js_path.read_text(encoding="utf-8")

    # Replace external stylesheet with inline style tag
    css_tag = f"<style>\n{css_content}\n</style>"
    bundled_html = index_content.replace('<link rel="stylesheet" href="styles.css" />', css_tag)

    # Replace external script with inline script tag
    js_tag = f"<script>\n{js_content}\n</script>"
    bundled_html = bundled_html.replace('<script src="app.js"></script>', js_tag)

    output_path.write_text(bundled_html, encoding="utf-8")
    print(f"Successfully generated standalone bundle: {output_path} ({len(bundled_html.encode('utf-8'))} bytes)")

if __name__ == "__main__":
    bundle()
