import struct
import zlib
import os

def create_png(width, height, get_pixel):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    png += struct.pack('!I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('!I', ihdr_crc)

    # Raw scanlines: filter byte 0 followed by RGBA per pixel
    raw_lines = bytearray()
    for y in range(height):
        raw_lines.append(0)  # filter type None
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_lines.extend((r, g, b, a))

    # IDAT chunk
    compressed = zlib.compress(bytes(raw_lines), 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    png += struct.pack('!I', len(compressed)) + b'IDAT' + compressed + struct.pack('!I', idat_crc)

    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    png += struct.pack('!I', 0) + b'IEND' + struct.pack('!I', iend_crc)

    return png

def get_pixel(x, y, w, h):
    # Rounded rectangle mask
    radius = max(2, w // 5)
    dx = min(x, w - 1 - x)
    dy = min(y, h - 1 - y)
    
    if dx < radius and dy < radius:
        dist_sq = (radius - dx)**2 + (radius - dy)**2
        if dist_sq > radius**2:
            return (0, 0, 0, 0) # transparent outer corner

    # Ukrainian flag: Blue top (#0057B7), Yellow bottom (#FFD700)
    if y < h // 2:
        return (0, 87, 183, 255)
    else:
        return (255, 215, 0, 255)

out_dir = os.path.join(os.path.dirname(__file__), "../src/icons")
os.makedirs(out_dir, exist_ok=True)

for size in [16, 48, 128]:
    data = create_png(size, size, get_pixel)
    file_path = os.path.join(out_dir, f"icon{size}.png")
    with open(file_path, "wb") as f:
        f.write(data)
    print(f"Generated {file_path}")
