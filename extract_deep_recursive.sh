#!/bin/bash
OUTPUT="recursive_deep_imports.txt"
echo "=== التقرير الشامل والمتعمق للـ imports ==0" > "$OUTPUT"

declare -A visited

process_file() {
    local filepath="$1"
    
    # التأكد من وجود الملف وأنه لم يتم فحصه من قبل
    if [[ -f "$filepath" ]] && [[ -z "${visited[$filepath]}" ]]; then
        visited["$filepath"]=1
        
        echo "========================================" >> "$OUTPUT"
        echo "الملف: $filepath" >> "$OUTPUT"
        echo "========================================" >> "$OUTPUT"
        
        # استخراج جمل الـ import كاملة مع استبعاد shadcn و node_modules
        local file_imports
        file_imports=$(awk '
            BEGIN { p=0 }
            /^[[:space:]]*import[[:space:]]/ { p=1; line=""; }
            p { line = line " " $0; if ($0 ~ /;/) { print line; p=0; } }
        ' "$filepath" 2>/dev/null | grep -vE "components/ui|node_modules" || true)
        
        if [[ -n "$file_imports" ]]; then
            echo "$file_imports" >> "$OUTPUT"
            echo "" >> "$OUTPUT"
            
            # قراءة كل سطر import للبحث عن المسارات الداخلية (@/) وتتبعها
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

# البدء بالمرور على جميع ملفات الـ routes ك نقطة بداية
find routes -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) | while read -r route_file; do
    process_file "$route_file"
done

echo "تم الانتهاء بنجاح! افتح ملف recursive_deep_imports.txt"
