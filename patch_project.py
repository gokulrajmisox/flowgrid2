import os

def main():
    hoisted_path = os.path.join('_astro', 'hoisted.81170750.js')
    if os.path.exists(hoisted_path):
        with open(hoisted_path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                if 'tunnels/tablet.png' in line or 'tunnels/desktop.png' in line:
                    print(f"Line {line_no}: contains tunnels/tablet.png or tunnels/desktop.png")
    else:
        print("hoisted JS not found")

if __name__ == '__main__':
    main()
