import os
import re
import shutil
import hashlib
import json
import time

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

def generate_build_id():
    return str(int(time.time()))

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
    build_id = generate_build_id()
    print(f"Build ID: {build_id}")

    # Process CSS (Copy + Minify + No Rename for now to simplify, relying on Query Param)
    # Actually, the original script renamed CSS. That's fine, we can keep that or switch to query param.
    # The requirement is "cache busting". Query param is easiest for everything.

    print("Processing CSS...")
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
            # Inject build ID into cache name if possible?
            # It's hard without parsing sw.js. For now just copy.
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
