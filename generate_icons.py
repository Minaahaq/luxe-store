#!/usr/bin/env python3
# ===========================================
# Generate PWA Icons - LUXE Store
# الاستخدام: python3 generate_icons.py
# ===========================================

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ===========================================
# Configuration
# ===========================================
ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'frontend', 'assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

# Colors
COLOR_INK = (10, 14, 23)         # #0a0e17
COLOR_INK_2 = (19, 24, 38)       # #131826
COLOR_INK_3 = (28, 34, 51)       # #1c2233
COLOR_GOLD = (201, 169, 97)      # #c9a961
COLOR_GOLD_LIGHT = (232, 213, 163)  # #e8d5a3
COLOR_GOLD_DARK = (168, 137, 74)    # #a8894a
COLOR_WHITE = (255, 255, 255)

# ===========================================
# Find a serif font for "LUXE"
# ===========================================
def find_serif_font():
    """ابحث عن خط Serif على النظام"""
    candidates = [
        # macOS
        '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf',
        '/System/Library/Fonts/Times.ttc',
        '/Library/Fonts/Georgia Bold.ttf',
        '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
        '/System/Library/Fonts/Supplemental/Didot.ttc',
        # Linux
        '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
        # Windows
        'C:\\Windows\\Fonts\\timesbd.ttf',
        'C:\\Windows\\Fonts\\georgiab.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            print(f'  📝 خط مستخدم: {path}')
            return path
    print('  ⚠️ مفيش خط serif، هستخدم الافتراضي')
    return None

SERIF_FONT = find_serif_font()

# ===========================================
# Gradient helper
# ===========================================
def linear_gradient(size, color1, color2, angle=135):
    """ينشئ gradient قطري"""
    w, h = size
    gradient = Image.new('RGB', size, color1)
    draw = ImageDraw.Draw(gradient)

    # diagonal gradient
    for y in range(h):
        for x in range(0, w, 4):  # سرعة
            t = (x + y) / (w + h)
            r = int(color1[0] + (color2[0] - color1[0]) * t)
            g = int(color1[1] + (color2[1] - color1[1]) * t)
            b = int(color1[2] + (color2[2] - color1[2]) * t)
            draw.rectangle([x, y, x + 4, y + 1], fill=(r, g, b))
    return gradient

def radial_glow(size, color, center, radius, max_alpha=60):
    """ينشئ توهج دائري"""
    w, h = size
    glow = Image.new('RGBA', size, (0, 0, 0, 0))
    pixels = glow.load()
    cx, cy = center
    for y in range(h):
        for x in range(w):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if dist < radius:
                alpha = int(max_alpha * (1 - dist / radius))
                pixels[x, y] = (*color, alpha)
    return glow

# ===========================================
# Icon generator
# ===========================================
def generate_icon(size, filename, maskable=False):
    """يولّد أيقونة بالحجم المطلوب"""
    # Super-sampling للأيقونات الصغيرة (جودة أعلى)
    ss = 4 if size < 100 else 2
    S = size * ss

    # ============ Background ============
    bg = linear_gradient((S, S), COLOR_INK, COLOR_INK_3)

    # توهج ذهبي في المنتصف
    glow = radial_glow((S, S), COLOR_GOLD, (S // 2, S // 2), int(S * 0.7), 40)
    bg = bg.convert('RGBA')
    bg.alpha_composite(glow)

    # ============ Rounded corners ============
    if not maskable:
        radius = int(S * 0.22)
        mask = Image.new('L', (S, S), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([0, 0, S, S], radius=radius, fill=255)
        bg.putalpha(mask)

    img = bg

    # ============ Inner border ============
    if not maskable:
        border = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        bd = ImageDraw.Draw(border)
        margin = int(S * 0.08)
        bd.rounded_rectangle(
            [margin, margin, S - margin, S - margin],
            radius=int(S * 0.15),
            outline=(*COLOR_GOLD, 60),
            width=max(1, int(S * 0.005))
        )
        img = Image.alpha_composite(img, border)

    # ============ Ornaments ============
    orn = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(orn)
    lw = max(1, int(S * 0.004))

    # Top ornament
    top_y = S * 0.30 if maskable else S * 0.30
    od.line([(S * 0.35, top_y + S * 0.04), (S * 0.5, top_y), (S * 0.65, top_y + S * 0.04)],
            fill=(*COLOR_GOLD, 100), width=lw)

    # Bottom ornament
    bot_y = S * 0.70 if maskable else S * 0.70
    od.line([(S * 0.35, bot_y - S * 0.04), (S * 0.5, bot_y), (S * 0.65, bot_y - S * 0.04)],
            fill=(*COLOR_GOLD, 100), width=lw)

    img = Image.alpha_composite(img, orn)

    # ============ LUXE text ============
    text_layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    td = ImageDraw.Draw(text_layer)

    # حجم الخط
    font_size = int(S * (0.20 if maskable else 0.22))

    if SERIF_FONT:
        try:
            font = ImageFont.truetype(SERIF_FONT, font_size)
        except Exception:
            font = ImageFont.load_default()
    else:
        font = ImageFont.load_default()

    text = "LUXE"
    # letter spacing: نرسم كل حرف لوحده
    letter_spacing = int(S * 0.015)

    # قياس عرض النص الكلي
    char_widths = []
    total_width = 0
    for ch in text:
        bbox = td.textbbox((0, 0), ch, font=font)
        w_char = bbox[2] - bbox[0]
        char_widths.append(w_char)
        total_width += w_char + letter_spacing
    total_width -= letter_spacing  # آخر حرف مش محتاج spacing

    x_start = (S - total_width) / 2
    bbox = td.textbbox((0, 0), text, font=font)
    text_height = bbox[3] - bbox[1]
    y_pos = (S / 2) - (text_height / 2) - bbox[1] + (S * 0.02 if maskable else 0)

    # Gradient text - نرسم النص، بعدين نعمل قناع
    text_mask = Image.new('L', (S, S), 0)
    md = ImageDraw.Draw(text_mask)
    x_cur = x_start
    for i, ch in enumerate(text):
        md.text((x_cur, y_pos), ch, fill=255, font=font)
        x_cur += char_widths[i] + letter_spacing

    # نص بـ gradient ذهبي
    gold_grad = linear_gradient((S, S), COLOR_GOLD_LIGHT, COLOR_GOLD_DARK)
    gold_grad_rgba = gold_grad.convert('RGBA')
    gold_grad_rgba.putalpha(text_mask)

    img = Image.alpha_composite(img, gold_grad_rgba)

    # ============ Gold dot ============
    dot_layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dot_layer)
    dot_cy = S * (0.73 if maskable else 0.75)
    dot_r = max(2, int(S * 0.012))
    dd.ellipse([S/2 - dot_r, dot_cy - dot_r, S/2 + dot_r, dot_cy + dot_r],
               fill=COLOR_GOLD)
    img = Image.alpha_composite(img, dot_layer)

    # ============ Downsample ============
    final = img.resize((size, size), Image.LANCZOS)

    # ============ Save ============
    output_path = os.path.join(ASSETS_DIR, filename)
    if filename.endswith('.ico'):
        # .ico بيحتاج RGBA
        final.save(output_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    elif filename.endswith('.svg'):
        # اتخطى SVG (مش بياخد PNG)
        pass
    else:
        final.save(output_path, format='PNG', optimize=True)

    file_size = os.path.getsize(output_path) / 1024
    print(f'  ✅ {filename:<28} {size}x{size:<5} ({file_size:.1f} KB)')

# ===========================================
# SVG (يدوي - عشان يكون احتياطي)
# ===========================================
def generate_svg(filename):
    """يولّد أيقونة SVG"""
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#1c2233"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8d5a3"/>
      <stop offset="50%" stop-color="#c9a961"/>
      <stop offset="100%" stop-color="#a8894a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c9a961" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#c9a961" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="230" fill="url(#glow)"/>
  <rect x="41" y="41" width="430" height="430" rx="77" fill="none" stroke="#c9a961" stroke-opacity="0.2" stroke-width="2.5"/>
  <path d="M 179 173 L 256 150 L 333 173" stroke="#c9a961" stroke-opacity="0.4" stroke-width="2" fill="none"/>
  <text x="50%" y="57%" text-anchor="middle" font-family="Georgia, serif" font-size="110" font-weight="900" letter-spacing="14" fill="url(#gold)">LUXE</text>
  <circle cx="256" cy="378" r="6" fill="#c9a961"/>
  <path d="M 179 340 L 256 358 L 333 340" stroke="#c9a961" stroke-opacity="0.4" stroke-width="2" fill="none"/>
</svg>'''
    output_path = os.path.join(ASSETS_DIR, filename)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f'  ✅ {filename:<28} {"SVG":<10}')

# ===========================================
# Main
# ===========================================
def main():
    print('')
    print('🎨 ==========================================')
    print('   LUXE Store — Icon Generator')
    print('   ==========================================')
    print('')
    print(f'  📁 المجلد: {ASSETS_DIR}')
    print('')
    print('  🎨 بدء توليد الأيقونات...\n')

    icons = [
        # (اسم, حجم, maskable?)
        ('icon-192.png',        192,  False),
        ('icon-512.png',        512,  False),
        ('icon-maskable-192.png', 192, True),
        ('icon-maskable.png',   512,  True),
        ('apple-touch-icon.png',180,  False),
        ('favicon-16x16.png',   16,   False),
        ('favicon-32x32.png',   32,   False),
        ('favicon-48x48.png',   48,   False),
        ('favicon.ico',         32,   False),
        ('splash-2048x2732.png',2048, False),
        ('splash-1668x2388.png',1668, False),
        ('splash-1536x2048.png',1536, False),
        ('splash-1125x2436.png',1125, False),
        ('splash-1242x2688.png',1242, False),
    ]

    total = 0
    for name, size, maskable in icons:
        try:
            generate_icon(size, name, maskable)
            total += 1
        except Exception as e:
            print(f'  ❌ {name}: {e}')

    # SVG
    try:
        generate_svg('icon.svg')
        total += 1
    except Exception as e:
        print(f'  ❌ icon.svg: {e}')

    print('')
    print('  🎉 ==========================================')
    print(f'     تم توليد {total} ملف بنجاح!')
    print('     📁 frontend/assets/')
    print('     ==========================================')
    print('')

if __name__ == '__main__':
    try:
        from PIL import Image
    except ImportError:
        print('❌ Pillow مش مثبت!')
        print('   شغّل: pip3 install Pillow')
        exit(1)

    main()
