#!/bin/bash
OUTPUT="recursive_imports_clean.txt"
echo "=== تقرير الـ imports المتداخلة والشاملة ===" > "$OUTPUT"

declare -A visited

process_file() {
    local filepath="$1"
    
    if [[ -f "$filepath" ]] && [[ -z "${visited[$filepath]}" ]]; then
        visited["$filepath"]=1
        
        echo "----------------------------------------" >> "$OUTPUT"
        echo "الملف: $filepath" >> "$OUTPUT"
        echo "----------------------------------------" >> "$OUTPUT"
        
        # استخدام awk لطباعة جمل الاستيراد كاملة (حتى لو كانت مقسمة على عدة أسطر) واستبعاد shadcn و node_modules والمكتبات الخارجية
        local file_imports
        file_imports=$(awk '
            BEGIN { p=0 }
            /^[[:space:]]*import[[:space:]]/ { p=1; line=""; }
            p { line = line " " $0; if ($0 ~ /;/) { print line; p=0; } }
        ' "$filepath" 2>/dev/null | grep -vE "components/ui|node_modules" || true)
        
        if [[ -n "$file_imports" ]]; then
            echo "$file_imports" >> "$OUTPUT"
            echo "" >> "$OUTPUT"
            
            # تتبع المسارات الداخلية لفتحها واستخراج ما بداخله
            while IFS=read -r line; do
                local path_target
                path_target=$(echo "$line" | sed -n 's/.*from ["\x27]\([^"\x27]*\)["\x27].*/\1/p')
                
                if [[ "$path_target" =~ ^@/ ]]; then
                    local rel_path="src/${path_target#@/}"
                    for ext in ".ts" ".tsx" ".js" ".jsx" "/index.ts" "/index.tsx"; do
                        if [[ -f "${rel_path}${ext}" ]]; then
                            process_file "${rel_path}${ext}"
                            break
                        elif [[ -f "$rel_path" ]]; then
                            process_file "$rel_path"
                            break
                        fi
                    done
                fi
            done <<< "$file_imports"
        fi
    fi
}

# البدء بالمرور على ملفات مجلد routes
find routes -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) | while read -r route_file; do
    process_file "$route_file"
done

echo "تم الانتهاء بنجاح! افتح ملف recursive_imports_clean.txt"
