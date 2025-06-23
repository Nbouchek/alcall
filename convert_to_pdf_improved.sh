#!/bin/bash

# Convert README.improved.md to PDF with proper rendering of HTML tags and mermaid diagrams
# This script processes HTML tags, mermaid diagrams, and other formatting issues

set -e

INPUT_FILE="README.improved.md"
OUTPUT_PDF="README.improved.pdf"
TEMP_DIR="temp_diagrams"
PROCESSED_FILE="README_processed.md"

echo "🚀 Starting improved PDF conversion..."

# Create temporary directory for diagrams
mkdir -p "$TEMP_DIR"

# Copy the original file
cp "$INPUT_FILE" "$PROCESSED_FILE"

# Process HTML tags and formatting issues
echo "🔧 Processing HTML tags and formatting..."

# Replace <div align="center"> with markdown center syntax
sed -i.bak 's/<div align="center">/<!-- CENTER START -->/g' "$PROCESSED_FILE"
sed -i.bak 's/<\/div>/<!-- CENTER END -->/g' "$PROCESSED_FILE"

# Replace other common HTML tags that might cause issues
sed -i.bak 's/<br>/  /g' "$PROCESSED_FILE"
sed -i.bak 's/<hr>/---/g' "$PROCESSED_FILE"

# Process badges and links to ensure they render properly
# Convert HTML-style badges to markdown badges where possible
sed -i.bak 's/\[!\[\([^]]*\)\]\([^)]*\)\]/![\1](\2)/g' "$PROCESSED_FILE"

# Find and process mermaid diagrams
echo "📊 Processing mermaid diagrams..."

# Counter for diagram files
diagram_counter=1

# Process mermaid code blocks and replace with image references
while IFS= read -r line; do
    if [[ "$line" =~ ^\`\`\`mermaid ]]; then
        # Start of mermaid block
        diagram_content=""
        in_mermaid=true
        continue
    elif [[ "$line" =~ ^\`\`\`$ ]] && [[ "$in_mermaid" == "true" ]]; then
        # End of mermaid block
        in_mermaid=false

        # Generate diagram image
        diagram_file="diagram_${diagram_counter}.png"
        echo "  Generating diagram $diagram_counter: $diagram_file"

        # Create temporary mermaid file
        temp_mermaid="temp_${diagram_counter}.mmd"
        echo "$diagram_content" > "$temp_mermaid"

        # Generate PNG using mermaid-cli with transparent background
        mmdc -i "$temp_mermaid" -o "$TEMP_DIR/$diagram_file" -b transparent

        # Clean up temp file
        rm "$temp_mermaid"

        # Replace mermaid block with image reference in processed file
        sed -i.bak2 "/\`\`\`mermaid/,/\`\`\`/c\\
\\
![Diagram $diagram_counter]($TEMP_DIR/$diagram_file)\\
\\
" "$PROCESSED_FILE"

        ((diagram_counter++))
        continue
    fi

    if [[ "$in_mermaid" == "true" ]]; then
        # Collect mermaid content
        diagram_content+="$line"$'\n'
    fi
done < "$PROCESSED_FILE"

# Clean up backup files
rm -f "$PROCESSED_FILE.bak" "$PROCESSED_FILE.bak2"

# Create a custom CSS file for better PDF styling
cat > custom_style.css << 'EOF'
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
    margin-top: 30px;
    margin-bottom: 15px;
}

h1 {
    border-bottom: 3px solid #3498db;
    padding-bottom: 10px;
}

h2 {
    border-bottom: 2px solid #ecf0f1;
    padding-bottom: 8px;
}

code {
    background-color: #f8f9fa;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

pre {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
    border-left: 4px solid #3498db;
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 20px 0;
}

th, td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
}

th {
    background-color: #f8f9fa;
    font-weight: bold;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 20px auto;
    border: 1px solid #ddd;
    border-radius: 5px;
}

blockquote {
    border-left: 4px solid #3498db;
    margin: 20px 0;
    padding: 10px 20px;
    background-color: #f8f9fa;
}

a {
    color: #3498db;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

.badge {
    display: inline-block;
    padding: 4px 8px;
    margin: 2px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
    text-decoration: none;
}

.center {
    text-align: center;
}
EOF

echo "📄 Generating PDF with custom styling..."
markdown-pdf "$PROCESSED_FILE" -o "$OUTPUT_PDF" -s custom_style.css

echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
rm "$PROCESSED_FILE"
rm custom_style.css

echo "✅ Improved PDF generation complete: $OUTPUT_PDF"
echo "📊 Processed $((diagram_counter-1)) mermaid diagrams"
echo "🔧 Fixed HTML tags and formatting issues"
