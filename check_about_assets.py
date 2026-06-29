import urllib.request
import urllib.error

textures = [
    "fog.png",
    "ground_person_shadow.webp",
    "person.webp",
    "person_light.webp",
    "rocks.webp",
    "terrain_shadow_light_height.webp"
]

models = [
    "bg_box.buf",
    "camera_spline.buf",
    "letter_placements.buf",
    "logo_text.buf",
    "person.buf",
    "person_idle.buf",
    "rock_0.buf",
    "rock_0_low.buf",
    "rock_1.buf",
    "rock_1_low.buf",
    "rock_2.buf",
    "rock_2_low.buf",
    "rock_3.buf",
    "rock_3_low.buf",
    "rock_animation_0.buf",
    "rock_animation_1.buf",
    "rock_animation_2.buf",
    "rock_animation_3.buf",
    "sphere_l.buf",
    "sphere_m.buf",
    "sphere_s.buf",
    "sphere_xs.buf",
    "terrain.buf",
    "terrain_lines.buf"
]

base_url = "https://techscript.is-a.dev/lusion-clone/assets/"
print("Checking about textures on the server...")
missing = 0
for t in textures:
    url = base_url + "textures/about/" + t
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.HTTPError as e:
        print(f"MISSING TEXTURE: {t} -> {e.code}")
        missing += 1

print("\nChecking about models on the server...")
for m in models:
    url = base_url + "models/about/" + m
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.HTTPError as e:
        print(f"MISSING MODEL: {m} -> {e.code}")
        missing += 1

print(f"\nScan complete. Total missing: {missing}")
