#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для импорта словарей из txt файлов в JSON формат для Codenames
Использование: python import_dictionaries.py
"""

import os
import json
import glob
from pathlib import Path

def process_txt_files():
    """Обрабатывает все txt файлы и создает соответствующие JSON словари"""
    script_dir = Path(__file__).parent
    txt_files = glob.glob(str(script_dir / "*.txt"))
    
    if not txt_files:
        print("ERROR: Не найдено ни одного txt файла в папке dictionaries")
        return
    
    print(f"INFO: Найдено {len(txt_files)} txt файлов для обработки")
    
    for txt_file_path in txt_files:
        txt_file = Path(txt_file_path)
        locale = txt_file.stem  # Получаем имя файла без расширения (например, "cs" из "cs.txt")
        json_file = script_dir / f"dictionaries_{locale}.json"
        
        print(f"PROCESSING: {locale}.txt -> dictionaries_{locale}.json")
        
        # Читаем слова из txt файла
        try:
            with open(txt_file, 'r', encoding='utf-8') as f:
                words = []
                for line in f:
                    word = line.strip().upper()  # Переводим в верхний регистр
                    if word:  # Игнорируем пустые строки
                        words.append(word)
            
            if not words:
                print(f"WARNING: {locale}.txt пустой или содержит только пустые строки")
                continue
                
            print(f"LOADED: {len(words)} слов из {locale}.txt")
            
        except Exception as e:
            print(f"ERROR: Ошибка чтения {locale}.txt: {e}")
            continue
        
        # Загружаем существующий JSON или создаем новый
        try:
            if json_file.exists():
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = {"dictionaries": []}
                
            # Определяем следующий ID
            existing_ids = [int(d.get('id', 0)) for d in data['dictionaries'] if d.get('id', '').isdigit()]
            next_id = str(max(existing_ids) + 1) if existing_ids else "1"
            
            # Создаем новый словарь
            new_dictionary = {
                "id": next_id,
                "title": "",  # Пустое название, пользователь заполнит потом
                "words": words
            }
            
            # Добавляем новый словарь
            data['dictionaries'].append(new_dictionary)
            
            # Сохраняем JSON файл
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"SUCCESS: Создан словарь ID={next_id} в dictionaries_{locale}.json ({len(words)} слов)")
            
        except Exception as e:
            print(f"ERROR: Ошибка обработки JSON для {locale}: {e}")
            continue
    
    print("COMPLETED: Обработка завершена!")

if __name__ == "__main__":
    print("START: Запуск импорта словарей из txt файлов...")
    process_txt_files()