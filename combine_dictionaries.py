#!/usr/bin/env python3
import json
import os

# Путь к папке со словарями
dictionaries_path = "public/dictionaries"
output_file = os.path.join(dictionaries_path, "dictionaries.json")

# Объединенный словарь
combined = {"dictionaries": []}

# Ищем все файлы dic-*.json
for i in range(1, 10):  # Проверяем до dic-9.json
    filename = f"dic-{i}.json"
    filepath = os.path.join(dictionaries_path, filename)
    
    if os.path.exists(filepath):
        print(f"Найден словарь: {filename}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Добавляем в общий файл
        dictionary_entry = {
            "id": f"dic-{i}",
            "title": data.get("title", f"Словарь {i}"),
            "words": data.get("words", [])
        }
        
        combined["dictionaries"].append(dictionary_entry)
        print(f"  - Слов: {len(dictionary_entry['words'])}")

# Сохраняем объединенный файл
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(combined, f, ensure_ascii=False, indent=2)

print(f"\nОбъединено {len(combined['dictionaries'])} словарей в {output_file}")
print("Готово!")