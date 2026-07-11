#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
App-Icon Generator fuer "Instrumente lernen".

Design-Familie der Schwester-App "Sprachen lernen":
- Dunkles Marineblau als weicher radialer Verlauf (#081f34 aussen -> #124063 Mitte/oben)
- Dezente dunklere Glow-Ringe fuer Tiefe
- Akzent Tuerkis/Cyan (#2ecbe0, hell #7fe3ee, dunkel #12b0cd) als Verlauf
- Warmes Gelb (#ffd166) sparsam als Zusatz-Akzent
- Glossy, modern, iOS-Optik, weiche Schatten, sanftes Glow

Motiv: grosse glaenzende Achtelnote (Cyan-Verlauf) mit weichem Glow,
dazu dezente Schallwellen-Boegen als Andeutung fuer mehrere Instrumente.

Rendering intern bei hoher Aufloesung, dann sauber mit LANCZOS runterskaliert.
"""

import math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

# ---------------------------------------------------------------------------
# Grundeinstellungen
# ---------------------------------------------------------------------------
SS = 4                      # Supersampling-Faktor
BASE = 1024                 # logische Zielgroesse fuer das Master-Render
R = BASE * SS               # interne Render-Groesse

OUT_DIR = "/Users/alessandro/Desktop/Privat/Instrumente Lernen/assets"

# Farben ---------------------------------------------------------------------
NAVY_OUT = (8, 31, 52)      # #081f34
NAVY_MID = (18, 64, 99)     # #124063
NAVY_DEEP = (5, 20, 34)     # noch dunkler fuer Ecken

CYAN = (46, 203, 224)       # #2ecbe0
CYAN_LIGHT = (127, 227, 238)  # #7fe3ee
CYAN_DARK = (18, 176, 205)  # #12b0cd
YELLOW = (255, 209, 102)    # #ffd166
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))


# ---------------------------------------------------------------------------
# Hintergrund: radialer Marineblau-Verlauf + Glow-Ringe
# ---------------------------------------------------------------------------
def make_background(size):
    cx, cy = size * 0.5, size * 0.42   # Lichtzentrum leicht oberhalb der Mitte
    maxd = math.hypot(size * 0.62, size * 0.62)

    bg = Image.new("RGB", (size, size))
    px = bg.load()
    # Der Verlauf haengt von der Distanz zum Lichtzentrum ab.
    # Wir rendern in reduzierter Aufloesung und skalieren hoch (schnell + weich).
    small = max(256, size // 6)
    tmp = Image.new("RGB", (small, small))
    tp = tmp.load()
    scx, scy = small * 0.5, small * 0.42
    smaxd = math.hypot(small * 0.62, small * 0.62)
    for y in range(small):
        for x in range(small):
            d = math.hypot(x - scx, y - scy) / smaxd
            d = min(1.0, d)
            # weiche Kurve: Mitte hell (MID), aussen dunkel (OUT -> DEEP)
            if d < 0.75:
                t = d / 0.75
                c = lerp(NAVY_MID, NAVY_OUT, t)
            else:
                t = (d - 0.75) / 0.25
                c = lerp(NAVY_OUT, NAVY_DEEP, t)
            tp[x, y] = c
    bg = tmp.resize((size, size), Image.LANCZOS)

    # Dezente konzentrische Glow-Ringe fuer Tiefe -----------------------------
    rings = Image.new("L", (size, size), 0)
    rd = ImageDraw.Draw(rings)
    for i, rr in enumerate([0.30, 0.46, 0.62]):
        rad = size * rr
        w = int(size * 0.010)
        bbox = [cx - rad, cy - rad, cx + rad, cy + rad]
        rd.ellipse(bbox, outline=int(70 - i * 16), width=w)
    rings = rings.filter(ImageFilter.GaussianBlur(size * 0.02))
    # Ringe als leichtes Aufhellen einblenden
    glowcol = Image.new("RGB", (size, size), lerp(NAVY_MID, CYAN_DARK, 0.15))
    bg = Image.composite(glowcol, bg, rings.point(lambda v: int(v * 0.55)))

    return bg.convert("RGBA")


# ---------------------------------------------------------------------------
# Vertikaler Farbverlauf als RGBA-Fuellung (fuer das Motiv)
# ---------------------------------------------------------------------------
def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size))
    gp = grad.load()
    for y in range(size):
        gp[0, y] = lerp(top, bottom, y / max(1, size - 1))
    return grad.resize((size, size), Image.NEAREST).convert("RGBA")


# ---------------------------------------------------------------------------
# Schallwellen-Boegen (dezent, rechts hinter der Note)
# ---------------------------------------------------------------------------
def draw_soundwaves(size):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Ursprung der Boegen: Zentrum des Notenkopfs (links unten)
    ox, oy = size * 0.40, size * 0.66
    arcs = [
        (0.30, 150, CYAN, 90),
        (0.40, 130, CYAN_LIGHT, 70),
        (0.50, 110, CYAN, 55),
    ]
    for rr, alpha, col, w in arcs:
        rad = size * rr
        bbox = [ox - rad, oy - rad, ox + rad, oy + rad]
        # Boegen oeffnen nach rechts oben
        d.arc(bbox, start=-58, end=18, fill=col + (alpha,), width=int(size * w / 4000))
    layer = layer.filter(ImageFilter.GaussianBlur(size * 0.004))
    return layer


# ---------------------------------------------------------------------------
# Achtelnote als Maske (Notenkopf schraeg, Hals, Fahne)
# ---------------------------------------------------------------------------
def build_note_mask(size):
    """Gibt eine L-Maske der kompletten Note zurueck."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)

    # --- Notenhals -----------------------------------------------------------
    stem_x = size * 0.560
    stem_w = size * 0.052
    stem_top = size * 0.235
    stem_bottom = size * 0.640
    d.rounded_rectangle(
        [stem_x - stem_w / 2, stem_top, stem_x + stem_w / 2, stem_bottom],
        radius=stem_w * 0.5, fill=255,
    )

    # --- Notenkopf (schraege Ellipse) ---------------------------------------
    # Wir zeichnen eine Ellipse und rotieren sie leicht.
    head_w = size * 0.300
    head_h = size * 0.220
    head_cx = stem_x - size * 0.098
    head_cy = size * 0.640
    head = Image.new("L", (size, size), 0)
    hd = ImageDraw.Draw(head)
    hd.ellipse(
        [head_cx - head_w / 2, head_cy - head_h / 2,
         head_cx + head_w / 2, head_cy + head_h / 2],
        fill=255,
    )
    head = head.rotate(-22, resample=Image.BICUBIC, center=(head_cx, head_cy))
    m = ImageChops.lighter(m, head)

    # --- Fahne (Flag) --------------------------------------------------------
    # weiche, geschwungene klassische Achtelnoten-Fahne rechts am Hals
    def bezier(p0, p1, p2, n=40):
        pts = []
        for i in range(n + 1):
            t = i / n
            mt = 1 - t
            x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
            y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
            pts.append((x, y))
        return pts

    flag = Image.new("L", (size, size), 0)
    fd = ImageDraw.Draw(flag)
    fx = stem_x + stem_w * 0.30
    fy = stem_top - size * 0.004
    # Aussenkante: vom Halsansatz weit nach rechts unten schwingen
    outer = bezier(
        (fx, fy),
        (fx + size * 0.235, fy + size * 0.055),
        (fx + size * 0.150, fy + size * 0.315),
    )
    # Innenkante: von der Spitze zurueck zum Hals, hoehere Lage -> schlanke Fahne
    inner = bezier(
        (fx + size * 0.150, fy + size * 0.315),
        (fx + size * 0.135, fy + size * 0.140),
        (fx, fy + size * 0.135),
    )
    fd.polygon(outer + inner, fill=255)
    m = ImageChops.lighter(m, flag)

    return m


# ---------------------------------------------------------------------------
# Note mit Verlauf, Glow, Gloss zusammensetzen
# ---------------------------------------------------------------------------
def render_note(size):
    mask = build_note_mask(size)

    # Glow hinter der Note ----------------------------------------------------
    glow_mask = mask.filter(ImageFilter.GaussianBlur(size * 0.045))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_col = Image.new("RGBA", (size, size), CYAN + (255,))
    glow.paste(glow_col, (0, 0), glow_mask.point(lambda v: int(v * 0.85)))

    # Schatten (dunkel, leicht versetzt) -------------------------------------
    shadow_mask = mask.filter(ImageFilter.GaussianBlur(size * 0.02))
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sh_col = Image.new("RGBA", (size, size), (2, 12, 22, 255))
    off = int(size * 0.012)
    tmp = Image.new("L", (size, size), 0)
    tmp.paste(shadow_mask, (off, off))
    shadow.paste(sh_col, (0, 0), tmp.point(lambda v: int(v * 0.55)))

    # Koerper mit Cyan-Verlauf -----------------------------------------------
    grad = vertical_gradient(size, CYAN_LIGHT, CYAN_DARK)
    body = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    body.paste(grad, (0, 0), mask)

    # Gloss: heller Verlauf im oberen Teil (glaenzend) -----------------------
    gloss_mask = mask.copy()
    # oberen Bereich betonen: multiplikativ mit einem Top-Down-Verlauf
    topfade = Image.new("L", (size, size))
    tp = topfade.load()
    for y in range(size):
        # oben hell, unten dunkel
        v = max(0, 255 - int((y / size) * 420))
        for x in range(size):
            tp[x, y] = v
    gloss_alpha = ImageChops.multiply(gloss_mask, topfade)
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gloss.paste(Image.new("RGBA", (size, size), WHITE + (255,)), (0, 0),
                gloss_alpha.point(lambda v: int(v * 0.30)))

    # Highlight-Glanzpunkt am Notenkopf --------------------------------------
    hl = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hx, hy = size * 0.415, size * 0.585
    hw, hh = size * 0.085, size * 0.055
    hd.ellipse([hx - hw, hy - hh, hx + hw, hy + hh], fill=WHITE + (150,))
    hl = hl.filter(ImageFilter.GaussianBlur(size * 0.012))
    hl_final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hl_final.paste(hl, (0, 0), mask)

    # Alles kombinieren -------------------------------------------------------
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow)
    out = Image.alpha_composite(out, shadow)
    out = Image.alpha_composite(out, body)
    out = Image.alpha_composite(out, gloss)
    out = Image.alpha_composite(out, hl_final)
    return out


# ---------------------------------------------------------------------------
# Komplettes Master-Icon (ohne Rundung) rendern
# ---------------------------------------------------------------------------
def render_master():
    size = R
    img = make_background(size)
    img = Image.alpha_composite(img, draw_soundwaves(size))
    img = Image.alpha_composite(img, render_note(size))
    return img


# ---------------------------------------------------------------------------
# Abgerundete Ecken anwenden (iOS-Superellipsen-Anmutung, hier klassisch rund)
# ---------------------------------------------------------------------------
def rounded(img, radius_frac=0.225):
    size = img.size[0]
    radius = int(size * radius_frac)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def downscale(img, target):
    return img.resize((target, target), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Maskable-Variante: Motiv kleiner (sicherer Bereich ~80%), vollflaechig
# ---------------------------------------------------------------------------
def render_master_maskable():
    size = R
    bg = make_background(size)
    # Motiv auf ~80% skalieren und mittig platzieren
    motif = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    motif = Image.alpha_composite(motif, draw_soundwaves(size))
    motif = Image.alpha_composite(motif, render_note(size))
    scale = 0.82
    ms = int(size * scale)
    motif_small = motif.resize((ms, ms), Image.LANCZOS)
    off = (size - ms) // 2
    # leicht nach oben, damit optisch zentriert wirkt
    bg.alpha_composite(motif_small, (off, off))
    return bg


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Rendere Master ...")
    master = render_master()

    # Standard-Icons (abgerundet)
    specs = [
        ("icon-512.png", 512, True),
        ("icon.png", 512, True),
        ("icon-192.png", 192, True),
        ("apple-touch-icon-180.png", 180, True),
    ]
    for name, target, round_it in specs:
        img = downscale(master, target * SS if target * SS <= R else R)
        img = downscale(master, target)
        if round_it:
            img = rounded(img)
        img.save(f"{OUT_DIR}/{name}")
        print("  gespeichert:", name, f"{target}x{target}")

    # Maskable (vollflaechig, kein Rundung, Motiv ~80%)
    print("Rendere Maskable ...")
    mask_master = render_master_maskable()
    mimg = downscale(mask_master, 512)
    mimg.convert("RGBA").save(f"{OUT_DIR}/icon-512-maskable.png")
    print("  gespeichert: icon-512-maskable.png 512x512")

    print("Fertig.")


if __name__ == "__main__":
    main()
