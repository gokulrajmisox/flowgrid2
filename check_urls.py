import urllib.request
import urllib.error

urls = [
    "https://techscript.is-a.dev/flowgrid-clone/assets/textures/reel/desktop.mp4",
    "https://techscript.is-a.dev/flowgrid-clone/assets/textures/reel/mobile.mp4",
]

print("Checking reel videos on the server...")
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            print(f"URL: {url} -> Status: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"URL: {url} -> Status: {e.code}")
    except Exception as e:
        print(f"URL: {url} -> Error: {e}")
