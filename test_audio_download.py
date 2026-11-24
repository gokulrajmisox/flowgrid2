import urllib.request
import time

urls = [
    "https://techscript.is-a.dev/flowgrid-clone/assets/audios/generic.ogg",
    "https://techscript.is-a.dev/flowgrid-clone/assets/audios/generic_end.ogg",
    "https://techscript.is-a.dev/flowgrid-clone/assets/audios/cinematic_3.ogg",
]

print("Testing audio download speed and status...")
for url in urls:
    start = time.time()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = response.read()
            duration = time.time() - start
            print(f"URL: {url} -> Loaded {len(data)} bytes in {duration:.2f}s")
    except Exception as e:
        print(f"URL: {url} -> Failed: {e}")
