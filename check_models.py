import urllib.request
import urllib.error

files = [
    "astronaut_animations.buf",
    "astronaut_glove_shoes.buf",
    "astronaut_helmet.buf",
    "astronaut_helmet_glass.buf",
    "astronaut_in_animation.buf",
    "astronaut_out_animation.buf",
    "astronaut_wearpack.buf",
    "broken_glass.buf",
    "broken_glass_animation.buf",
    "diamond.buf",
    "earth_card.buf",
    "grid_base_hd.buf",
    "grid_base_ld.buf",
    "grid_structure_hd.buf",
    "grid_structure_ld.buf",
    "tunnel_block_base.buf",
    "tunnel_block_wall.buf",
]

base_url = "https://techscript.is-a.dev/flowgrid-clone/assets/models/tunnels/"
print("Checking model files on the server...")
missing = 0
for file in files:
    url = base_url + file
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.HTTPError as e:
        print(f"MISSING ({e.code}): {file}")
        missing += 1
    except Exception as e:
        print(f"Error: {file} -> {e}")
        missing += 1

print(f"Scan complete. Total missing: {missing}")
