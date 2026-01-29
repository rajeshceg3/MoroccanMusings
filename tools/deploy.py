import os
import re
import shutil
import hashlib
import json

# Configuration
DIST_DIR = 'dist'
ASSETS_DIR = 'assets'
CSS_DIR = 'css'
JS_DIR = 'js'

def clean_dist():
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)
    os.makedirs(os.path.join(DIST_DIR, 'css'))
    os.makedirs(os.path.join(DIST_DIR, 'js'))
    if os.path.exists(ASSETS_DIR):
        shutil.copytree(ASSETS_DIR, os.path.join(DIST_DIR, 'assets'))

def minify_css(content):
    # Basic minification: remove comments and whitespace
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'\s+', ' ', content)
    content = re.sub(r'\s*([{:;,}])\s*', r'\1', content)
    content = content.replace(';}', '}')
    return content

def minify_js(content):
    # Safe JS Minification: Remove comments and whitespace mostly
    lines = content.split('\n')
    minified_lines = []
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith('//'): continue
        if line.startswith('/*') and line.endswith('*/'): continue
        minified_lines.append(line)
    return '\n'.join(minified_lines)

def generate_content_hash():
    print("Calculating deterministic build hash...")
    hasher = hashlib.sha256()

    # Walk JS and CSS directories in deterministic order
    for directory in [JS_DIR, CSS_DIR]:
        if os.path.exists(directory):
            for root, dirs, files in os.walk(directory):
                for file in sorted(files): # Sort for determinism
                    if file.endswith('.js') or file.endswith('.css'):
                        filepath = os.path.join(root, file)
                        with open(filepath, 'rb') as f:
                            buf = f.read()
                            hasher.update(buf)

    # Also include index.html in hash calculation as it's the entry point
    if os.path.exists('index.html'):
        with open('index.html', 'rb') as f:
             hasher.update(f.read())

    build_hash = hasher.hexdigest()[:8]
    print(f"Build Hash: {build_hash}")
    return build_hash

def generate_robots_txt():
    content = """User-agent: *
Allow: /
Disallow: /private/
Disallow: /temp/

Sitemap: /sitemap.xml
"""
    with open(os.path.join(DIST_DIR, 'robots.txt'), 'w') as f:
        f.write(content)

def build():
    print("Initializing deployment sequence...")
    clean_dist()

    # Calculate hash based on source files
    build_id = generate_content_hash()

    print("Processing CSS...")
    if os.path.exists(CSS_DIR):
        for filename in os.listdir(CSS_DIR):
            if filename.endswith('.css'):
                with open(os.path.join(CSS_DIR, filename), 'r') as f:
                    content = f.read()

                minified = minify_css(content)
                # Write to dist without renaming
                with open(os.path.join(DIST_DIR, 'css', filename), 'w') as f:
                    f.write(minified)

    # Process JS
    print("Processing JS...")
    if os.path.exists(JS_DIR):
        for filename in os.listdir(JS_DIR):
            if filename.endswith('.js'):
                with open(os.path.join(JS_DIR, filename), 'r') as f:
                    content = f.read()

                minified = minify_js(content)
                with open(os.path.join(DIST_DIR, 'js', filename), 'w') as f:
                    f.write(minified)

    # Copy SW.js
    if os.path.exists('sw.js'):
        with open('sw.js', 'r') as f:
            content = f.read()
        with open(os.path.join(DIST_DIR, 'sw.js'), 'w') as f:
            f.write(content)

    # Process Index HTML
    print("Rewiring Index...")
    with open('index.html', 'r') as f:
        html = f.read()

    # Inject Cache Busting Query Params
    # Regex to find .css and .js references
    # Replace href="css/styles.css" with href="css/styles.css?v=BUILD_ID"

    def cache_bust_replacer(match):
        return f'{match.group(1)}?v={build_id}{match.group(2)}'

    # Cache bust CSS
    html = re.sub(r'(href="css/[^"]+\.css)(")', cache_bust_replacer, html)

    # Cache bust JS Modules
    html = re.sub(r'(src="js/[^"]+\.js)(")', cache_bust_replacer, html)

    # Minify HTML
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    html = re.sub(r'\s+', ' ', html)

    with open(os.path.join(DIST_DIR, 'index.html'), 'w') as f:
        f.write(html)

    generate_robots_txt()

    print("Deployment artifact ready in /dist")
    print("Mission Accomplished.")

if __name__ == '__main__':
    build()
