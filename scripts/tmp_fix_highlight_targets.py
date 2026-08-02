from pathlib import Path

path = Path("app/new-highlight.tsx")
text = path.read_text(encoding="utf-8")
text = text.replace(
    '''  starterChip: {
    minHeight: 44,''',
    '''  starterChip: {
    minHeight: 46,'''
)
text = text.replace(
    '''  kindButton: {
    minHeight: 44,''',
    '''  kindButton: {
    minHeight: 46,'''
)
path.write_text(text, encoding="utf-8")
