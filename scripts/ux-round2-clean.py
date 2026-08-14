from pathlib import Path

root = Path(__file__).resolve().parents[1]
for relative in ("src/components/EdgeSwipeBack.tsx", "src/components/SwipeTabShell.tsx"):
    path = root / relative
    if path.exists():
        path.unlink()
print("obsolete screen gesture wrappers removed")
