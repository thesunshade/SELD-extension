import os
import json
import re
import argparse

def slugify(text):
    """
    Python implementation of the project's slugify logic.
    Matches utils/bookDiscovery.ts
    """
    text = text.lower().strip()
    # Replace spaces with hyphens
    text = re.sub(r'\s+', '-', text)
    # Remove characters that are not letters, numbers, or hyphens
    # Using \w and ensuring unicode awareness
    text = re.sub(r'[^\w-]', '', text, flags=re.UNICODE)
    # Remove double hyphens
    text = re.sub(r'--+', '-', text)
    return text

def create_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f"  [+] Created {path}")

def get_mdx_template(title):
    return f"""
---
title: "{title}"
---

# {title}

Add your content here...
"""

def get_tsx_template(title):
    component_name = re.sub(r'[^a-zA-Z0-9]', '', title)
    if not component_name or component_name[0].isdigit():
        component_name = "Chapter" + component_name
    
    return f"""
import React from 'react';

export const metadata = {{
    title: "{title}"
}};

export default function {component_name}() {{
    return (
        <div className="chapter-content">
            <h1>{{metadata.title}}</h1>
            <p>Start building your interactive chapter here!</p>
        </div>
    );
}}
"""

def get_html_template(title):
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
</head>
<body>
    <h1>{title}</h1>
    <p>Existing HTML content goes here.</p>
</body>
</html>
"""

def scaffold():
    print("📚 Book Scaffolding Wizard")
    print("-" * 30)
    
    # Get the project root directory (two levels up from scripts/scaffold-book.py)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    assets_books_dir = os.path.join(project_root, "assets", "books")

    book_name = input("Enter Book Title: ").strip()
    if not book_name:
        print("Error: Book title cannot be empty.")
        return

    book_slug = slugify(book_name)
    book_dir = os.path.join(assets_books_dir, book_slug)
    chapters_dir = os.path.join(book_dir, "chapters")

    if os.path.exists(book_dir):
        print(f"Error: Directory '{book_dir}' already exists.")
        return

    # 1. Create Directories
    os.makedirs(chapters_dir)
    print(f"\n[1] Created book structure at {book_dir}")

    # 2. Create meta.json
    meta = {
        "title": book_name,
        "description": f"A new book about {book_name}.",
        "structure": []
    }

    # 3. Interactive Chapter Creation
    print("\n[2] Chapter Scaffolding (Press Enter without a name to finish)")
    
    while True:
        chapter_name = input("\nChapter Title: ").strip()
        if not chapter_name:
            break
        
        print("Select Type: (1) MDX [default], (2) React/TSX, (3) HTML")
        choice = input("Choice [1-3]: ").strip() or "1"
        
        has_css = input("Create dedicated CSS file? (y/n): ").lower().strip() == 'y'
        
        chapter_slug = slugify(chapter_name)
        
        filename = ""
        content = ""
        
        if choice == "2":
            filename = f"{chapter_slug}.tsx"
            content = get_tsx_template(chapter_name)
        elif choice == "3":
            filename = f"{chapter_slug}.html"
            content = get_html_template(chapter_name)
        else:
            filename = f"{chapter_slug}.mdx"
            content = get_mdx_template(chapter_name)
        
        # Write chapter file
        create_file(os.path.join(chapters_dir, filename), content)
        meta["structure"].append(filename)
        
        if has_css:
            css_filename = f"{chapter_slug}.css"
            css_content = f"/* Styles for {chapter_name} */\n.chapter-content {{\n    padding: 2rem;\n}}\n"
            create_file(os.path.join(chapters_dir, css_filename), css_content)

    # 4. Write Final meta.json
    create_file(os.path.join(book_dir, "meta.json"), json.dumps(meta, indent=2))
    
    # 5. Create optional book-theme.css
    theme_choice = input("\nCreate a book-theme.css? (y/n) [n]: ").lower().strip()
    if theme_choice == 'y':
        create_file(os.path.join(book_dir, "book-theme.css"), f"/* Global styles for {book_name} */\n")

    print(f"\n✨ Successfully scaffolded '{book_name}'!")
    print(f"Run 'node scripts/validate-books.js' to verify.")

if __name__ == "__main__":
    scaffold()
