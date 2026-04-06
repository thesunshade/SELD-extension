import os
import argparse
from bs4 import BeautifulSoup

def split_html_robust(input_file, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(input_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    h1_tags = soup.find_all('h1')
    
    if not h1_tags:
        print("No <h1> tags found.")
        return

    # Determine padding width (e.g., 2 for '01', 3 for '001')
    padding_width = len(str(len(h1_tags)))

    for i, h1 in enumerate(h1_tags):
        marker = soup.new_string(f"[[[SPLIT_{i}]]]")
        h1.insert_before(marker)

    body_content = str(soup.body)
    parts = body_content.split("[[[SPLIT_")

    for part in parts:
        if not part or "]]]" not in part:
            continue
        
        index_str, html_content = part.split("]]]", 1)
        index = int(index_str)
        
        # Format the number with leading zeros
        # :0{width} tells Python to pad with zeros to a specific length
        chapter_number = f"{index + 1:0{padding_width}}"
        
        title_text = h1_tags[index].get_text().strip().replace(' ', '_')
        clean_title = "".join(c for c in title_text if c.isalnum() or c in ('_', '-'))
        
        filename = f"{chapter_number}_{clean_title}.html"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f_out:
            f_out.write(f"<!DOCTYPE html>\n<html>\n<body>\n{html_content}\n</body>\n</html>")

    print(f"Successfully split into {len(h1_tags)} files in '{output_dir}'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="The HTML file to split")
    parser.add_argument("-o", "--output", default="chapters", help="Output directory")
    args = parser.parse_args()
    
    split_html_robust(args.input, args.output)