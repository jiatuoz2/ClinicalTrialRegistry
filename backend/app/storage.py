import os, pathlib, uuid

BASE = pathlib.Path(__file__).parent / ".." / "uploads"
BASE = BASE.resolve()
os.makedirs(BASE, exist_ok=True)

def save_temp_file(trial_id: int, content: bytes) -> str:
    path = BASE / f"trial_{trial_id}.bin"
    with open(path, "wb") as f:
        f.write(content)
    return str(path)
