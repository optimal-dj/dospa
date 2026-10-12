"""Écrit un dictionnaire {namespace: arbre} en fichiers messages/<locale>/<ns>.json (outil de rédaction)."""
import json, os, sys

def write(locale, data):
    base = os.path.join(os.path.dirname(__file__), '..', 'messages', locale)
    os.makedirs(base, exist_ok=True)
    for ns, tree in data.items():
        with open(os.path.join(base, f'{ns}.json'), 'w', encoding='utf-8') as f:
            json.dump(tree, f, ensure_ascii=False, indent=2)
            f.write('\n')
