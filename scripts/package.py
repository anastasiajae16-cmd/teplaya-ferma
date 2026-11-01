"""Package runtime-only VK release. Host files over HTTPS and configure a VK app."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root/'release';out.mkdir(exist_ok=True)
with zipfile.ZipFile(out/'teplaya-ferma-vk-v0.10.1.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted((root/'dist').rglob('*')):
  if p.is_file():
   name=p.relative_to(root/'dist').as_posix()
   z.writestr(name,"window.FARM_PLATFORM = 'vk';\n" if name=='platform-config.js' else p.read_bytes())
with zipfile.ZipFile(out/'teplaya-ferma-vk-v0.10.1.zip') as z:
 assert 'index.html' in z.namelist()
 assert 'vendor/vk-bridge-3.0.2.min.js' in z.namelist()
 assert all(' ' not in n and n.isascii() for n in z.namelist())
 assert b"'vk'" in z.read('platform-config.js')
 assert b'YaGames' not in z.read('platform.js')
print(out/'teplaya-ferma-vk-v0.10.1.zip')
