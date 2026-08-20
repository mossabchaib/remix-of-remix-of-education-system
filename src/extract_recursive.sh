#!/bin/bash
OUTPUT="recursive_imports_result.txt"
echo "=== قائمة الـ imports المتداخلة لمشروعك ===" > "$OUTPUT"

declare -A visited

process_file() {
    local filepath="$1"
    
    # التحقق من أن الملف موجود ولم يتم فحص مسبقاً
    if [[ -f "$filepath" ]] && [[ -z "${visited[$filepath]}" ]]; then
        visited["$filepath"]=1
        
        echo "----------------------------------------" >> "$OUTPUT"
        echo "الملف: $filepath" >> "$OUTPUT"
        echo "----------------------------------------" >> "$OUTPUT"
        
        # استخراج الـ imports الداخلية لهذا الملف فقط (بدون shadcn والمكتبات)
        local file_imports=$(grep "import " "$filepath" 2>/dev/null | grep -vE "components/ui|node_modules|react|lucide-react" || true)
        
        if [[ -n "$file_imports" ]]; then
            echo "$file_imports" >> "$OUTPUT"
            echo "" >> "$OUTPUT"
            
            # البحث استخراجياً داخل الـ imports التي تخص مسارات المشروع لفتحها والبحث فيها
            while IFS=read -r line; do
                # استخراج مسار الملف بين علامات التنصيص
                local path_target=$(echo "$line" | sed -n 's/.*from ["\x27]\([^"\x27]*\)["\x27].*/\1/p')
                
                if [[ "$path_target" =~ ^@/ ]]; then
                    # تحويل مسار @/ إلى مسار حقيقي داخل src
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

# البدء بالمرور على جميع ملفات مجلد routes
find routes -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) | while read -r route_file; do
    process_file "$route_file"
done

echo "تم الانتهاء بنجاح! افتح ملف recursive_imports_result.txt"
