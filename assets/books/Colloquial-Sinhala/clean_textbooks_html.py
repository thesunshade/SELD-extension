import argparse
import sys
from bs4 import BeautifulSoup

def surgical_cleanup(input_path, output_path):
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')

        # Find all spans and work backwards to "melt" nested ones correctly
        spans = soup.find_all('span')
        count = 0
        
        for span in reversed(spans):
            # Target spans that have lang OR style attributes
            if span.has_attr('lang') or span.has_attr('style'):
                span.unwrap()
                count += 1

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
            
        print(f"Success: Removed {count} junk spans.")
        print(f"Output saved to: {output_path}")

    except FileNotFoundError:
        print(f"Error: The file '{input_path}' was not found.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Strip specific junk spans from HTML.")
    
    # These become command-line arguments
    parser.add_argument("input", help="Path to the messy HTML file")
    parser.add_argument("output", help="Path where the cleaned file should be saved")
    
    args = parser.parse_args()
    
    surgical_cleanup(args.input, args.output)