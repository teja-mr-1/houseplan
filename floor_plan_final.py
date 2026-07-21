"""
1089 sq.ft West-Facing Vastu House Plan — Ongole
Direct-draw version: all coordinates in drawing (rx,ry) space.

Compass:
  Left  (rx=0.375) = North  (ఉత్తరం)
  Right (rx=32.625)= South  (దక్షిణం)
  Bottom(ry=0.375) = West   (పడమర) ← MAIN ENTRANCE
  Top   (ry=32.625)= East   (తూర్పు)
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import math, subprocess, warnings
warnings.filterwarnings("ignore")

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Noto Sans Telugu', 'DejaVu Sans', 'Liberation Sans']
plt.rcParams['svg.fonttype'] = 'none'

# ─── CONSTANTS ────────────────────────────────────────────────────────────────
T_EXT = 0.75    # 9" exterior wall
T_INT = 0.50    # 6" interior wall
RED   = "#c0392b"

# ─── PRIMITIVES ───────────────────────────────────────────────────────────────

def fill(ax, rx1, ry1, rx2, ry2, fc='white', ec='none', ls='-', lw=1.0, z=1):
    ax.add_patch(mpatches.Rectangle(
        (rx1, ry1), rx2-rx1, ry2-ry1,
        facecolor=fc, edgecolor=ec, linestyle=ls, linewidth=lw, zorder=z))

def wall_h(ax, rx1, rx2, ry, t=T_INT):
    """Horizontal wall strip centred on ry."""
    x = min(rx1, rx2); w = abs(rx2 - rx1)
    ax.add_patch(mpatches.Rectangle(
        (x, ry - t/2), w, t,
        facecolor='white', edgecolor='black', linewidth=1.4, zorder=5))

def wall_v(ax, rx, ry1, ry2, t=T_INT):
    """Vertical wall strip centred on rx."""
    y = min(ry1, ry2); h = abs(ry2 - ry1)
    ax.add_patch(mpatches.Rectangle(
        (rx - t/2, y), t, h,
        facecolor='white', edgecolor='black', linewidth=1.4, zorder=5))

def win_h(ax, rx1, rx2, ry, t=T_EXT):
    """Window in a horizontal wall (glass panes)."""
    x = min(rx1, rx2); w = abs(rx2 - rx1); wt = t * 0.85
    ax.add_patch(mpatches.Rectangle(
        (x, ry - wt/2), w, wt,
        facecolor='white', edgecolor='black', linewidth=0.8, zorder=6))
    for k in [0.25, 0.5, 0.75]:
        ax.plot([x + w*k, x + w*k], [ry - wt/2, ry + wt/2],
                color='black', lw=0.9, zorder=7)

def win_v(ax, rx, ry1, ry2, t=T_EXT):
    """Window in a vertical wall (glass panes)."""
    y = min(ry1, ry2); h = abs(ry2 - ry1); wt = t * 0.85
    ax.add_patch(mpatches.Rectangle(
        (rx - wt/2, y), wt, h,
        facecolor='white', edgecolor='black', linewidth=0.8, zorder=6))
    for k in [0.25, 0.5, 0.75]:
        ax.plot([rx - wt/2, rx + wt/2], [y + h*k, y + h*k],
                color='black', lw=0.9, zorder=7)

def door_in_hwall(ax, rx_hinge, rx_far, ry, swing='up'):
    """Door in a horizontal wall. Hinge at rx_hinge, panel to rx_far, arc swings up/down."""
    L = abs(rx_far - rx_hinge)
    d = 1 if swing == 'up' else -1
    # Panel line
    ax.plot([rx_hinge, rx_far], [ry, ry], 'k-', lw=2.0, zorder=8)
    # Perpendicular arm
    ax.plot([rx_hinge, rx_hinge], [ry, ry + d * L], 'k-', lw=2.0, zorder=8)
    # Arc
    t1, t2 = (0, 90) if d > 0 else (-90, 0)
    ax.add_patch(mpatches.Arc(
        (rx_hinge, ry), 2*L, 2*L, angle=0, theta1=t1, theta2=t2,
        color='black', ls=':', lw=1.2, zorder=4))

def door_in_vwall(ax, rx, ry_hinge, ry_far, swing='right'):
    """Door in a vertical wall. Hinge at ry_hinge, panel to ry_far, arc swings right/left."""
    L = abs(ry_far - ry_hinge)
    d = 1 if swing == 'right' else -1
    ax.plot([rx, rx], [ry_hinge, ry_far], 'k-', lw=2.0, zorder=8)
    ax.plot([rx, rx + d * L], [ry_hinge, ry_hinge], 'k-', lw=2.0, zorder=8)
    t1, t2 = (90, 180) if d < 0 else (0, 90)
    ax.add_patch(mpatches.Arc(
        (rx, ry_hinge), 2*L, 2*L, angle=0, theta1=t1, theta2=t2,
        color='black', ls=':', lw=1.2, zorder=4))

def pillar(ax, rx, ry, r=0.35):
    for pr in [r, r * 0.55]:
        ax.add_patch(mpatches.Circle(
            (rx, ry), pr, facecolor='white', edgecolor='black', lw=0.9, zorder=9))

def txt(ax, rx, ry, s, size=9, weight='bold', color='black', ha='center', va='center'):
    ax.text(rx, ry, s, fontsize=size, fontweight=weight, color=color,
            ha=ha, va=va, zorder=10)

def dim_txt(ax, rx, ry, s, size=8):
    ax.text(rx, ry, s, fontsize=size, fontweight='bold', color=RED,
            ha='center', va='center', zorder=10)

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def generate():
    fig, ax = plt.subplots(figsize=(14, 14))
    ax.set_aspect('equal')
    ax.set_xlim(-8, 42)
    ax.set_ylim(-9, 42)
    ax.axis('off')

    # ══════════════════════════════════════════════════════
    # 1. ROOM FILLS  (white rectangles — walls drawn on top)
    # ══════════════════════════════════════════════════════

    # Main rooms
    fill(ax,  0.75,  0.75, 16.25, 16.25)   # Hall (NW)
    fill(ax, 16.75,  0.75, 32.25, 16.25)   # Bed1 (SW)
    fill(ax, 16.75, 16.75, 32.25, 32.25)   # Kitchen (SE)
    fill(ax,  0.75, 16.75, 16.25, 32.25)   # Bed2 (NE)

    # Sub-rooms
    fill(ax,  0.75, 12.25,  4.75, 16.25)   # Pooja (NE of Hall)
    fill(ax, 26.25, 10.25, 32.25, 16.25)   # Bath1 (upper-right of Bed1)
    fill(ax,  0.75, 22.25,  6.75, 28.25)   # Bath2 (left strip of Bed2)

    # Front Porch (below West/bottom boundary)
    fill(ax, 0.75, -3.25, 16.25, 0.75,
         fc='white', ec='black', ls='--', lw=1.0, z=1)

    # ══════════════════════════════════════════════════════
    # 2. ROOM LABELS
    # ══════════════════════════════════════════════════════

    # Hall — centre of clear space (excluding Pooja corner)
    txt(ax,  8.5,  8.5, "చావడి / హాలు\n(వాయువ్యం)", size=10)
    dim_txt(ax, 8.5, 6.0, "15'6\" × 15'6\"")

    # Bed1 — centre of clear space (excluding Bath1 corner)
    txt(ax, 21.0,  6.0, "పడకగది 1\n(నైరుతి — ప్రధాన పడక)", size=10)
    dim_txt(ax, 21.0, 3.5, "15'6\" × 15'6\"")

    # Kitchen — centre (excluding counter strip)
    txt(ax, 23.0, 24.0, "వంట మరియు భోజన గది\n(ఆగ్నేయం)", size=10)
    dim_txt(ax, 23.0, 21.5, "15'6\" × 15'6\"")

    # Bed2 — centre of clear space (excluding Bath2 strip)
    txt(ax,  9.5, 25.0, "పడకగది 2\n(ఈశాన్యం)", size=10)
    dim_txt(ax, 9.5, 22.5, "15'6\" × 15'6\"")

    # Pooja
    txt(ax, 2.75, 14.25, "పూజా\nగది", size=7)
    dim_txt(ax, 2.75, 12.6, "4'×4'", size=6.5)

    # Bath1
    txt(ax, 29.25, 13.75, "స్నానాల\nగది 1", size=7)
    dim_txt(ax, 29.25, 10.65, "6'×6'", size=6.5)

    # Bath2
    txt(ax,  3.75, 25.25, "స్నా.\nగది 2", size=7)
    dim_txt(ax, 3.75, 22.65, "6'×6'", size=6.5)

    # Porch
    txt(ax,  8.5, -1.25, "చిన్న పంచ", size=8)
    dim_txt(ax, 8.5, -2.5, "15'6\" × 4'0\"", size=7)

    # Junction label (Nadava at centre)
    txt(ax, 14.75, 18.5, "నడవ", size=7.5, color='black')

    # ══════════════════════════════════════════════════════
    # 3. EXTERIOR WALLS
    # ══════════════════════════════════════════════════════
    T = T_EXT

    # NORTH wall (left vertical, rx=0.375) — segments + Bath2 ventilator
    wall_v(ax, 0.375,  0.75,  4.5,  T)   # below Hall north window
    wall_v(ax, 0.375,  7.5,  22.25,  T)  # Hall solid + below Bath2
    wall_v(ax, 0.375, 28.25, 32.25,  T)  # above Bath2

    # SOUTH wall (right vertical, rx=32.625)
    wall_v(ax, 32.625,  0.75,  4.0,  T)
    wall_v(ax, 32.625,  7.5,  10.25, T)
    wall_v(ax, 32.625, 13.5,  18.5,  T)
    wall_v(ax, 32.625, 22.5,  32.25, T)

    # WEST wall (bottom horizontal, ry=0.375) — main entrance + windows
    wall_h(ax,  0.75,  3.0,  0.375, T)   # Hall left solid
    wall_h(ax,  6.0,   9.5,  0.375, T)   # Hall right of window, before door
    # DOOR OPENING rx=9.5–13.0 (skip wall here)
    wall_h(ax, 13.0,  16.25, 0.375, T)   # Hall right of door to center wall
    wall_h(ax, 16.75, 19.5,  0.375, T)   # Bed1 left of window
    wall_h(ax, 22.5,  32.25, 0.375, T)   # Bed1 right solid

    # EAST wall (top horizontal, ry=32.625)
    wall_h(ax,  0.75,  4.0,  32.625, T)
    wall_h(ax,  7.5,  18.5,  32.625, T)
    wall_h(ax, 22.5,  32.25, 32.625, T)

    # ══════════════════════════════════════════════════════
    # 4. INTERIOR WALLS
    # ══════════════════════════════════════════════════════

    # CENTER VERTICAL (rx=16.5)  Hall|Bed2 ↔ Bed1|Kitchen
    wall_v(ax, 16.5,  0.75,  12.5,  T_INT)  # below Hall→Bed1 door
    # Gap ry=12.5–15.5: Hall→Bed1 door
    wall_v(ax, 16.5,  15.5,  16.5,  T_INT)  # short piece to junction
    # Gap ry=16.5–20.5: junction archway
    wall_v(ax, 16.5,  20.5,  32.25, T_INT)  # above junction

    # CENTER HORIZONTAL (ry=16.5)  Hall|Bed1 ↔ Bed2|Kitchen
    wall_h(ax,  0.75,  1.5,  16.5, T_INT)   # left solid
    # Gap rx=1.5–4.5: Hall→Bed2 door
    wall_h(ax,  4.5,  13.0,  16.5, T_INT)   # middle solid
    # Gap rx=13.0–16.5: junction archway
    wall_h(ax, 16.5,  32.25, 16.5, T_INT)   # right half Bed1↔Kitchen

    # POOJA PARTITIONS
    wall_h(ax,  0.75,  4.75, 12.25, T_INT)   # bottom of Pooja
    wall_v(ax,  4.75, 12.25, 13.5,  T_INT)   # right wall of Pooja (below door)
    # Gap ry=13.5–15.5: Pooja door
    wall_v(ax,  4.75, 15.5,  16.25, T_INT)   # right wall above door

    # BATH1 PARTITIONS
    wall_v(ax, 26.25, 10.25, 16.25, T_INT)   # left wall of Bath1
    wall_h(ax, 26.25, 27.0,  10.25, T_INT)   # bottom wall left of door
    # Gap rx=27.0–29.5: Bath1 door
    wall_h(ax, 29.5,  32.25, 10.25, T_INT)   # bottom wall right of door

    # BATH2 PARTITIONS
    wall_h(ax,  0.75,  6.75, 22.25, T_INT)   # bottom of Bath2
    wall_h(ax,  0.75,  6.75, 28.25, T_INT)   # top of Bath2
    wall_v(ax,  6.75, 22.25, 23.0,  T_INT)   # right wall below door
    # Gap ry=23.0–25.5: Bath2 door
    wall_v(ax,  6.75, 25.5,  28.25, T_INT)   # right wall above door

    # ══════════════════════════════════════════════════════
    # 5. WINDOWS
    # ══════════════════════════════════════════════════════

    # North exterior (left vertical)
    win_v(ax, 0.375,  4.5,   7.5)   # Hall north window
    win_v(ax, 0.375, 22.25, 28.25)  # Bath2 ventilator (entire Bath2 left wall)

    # South exterior (right vertical)
    win_v(ax, 32.625,  4.0,  7.5)   # Bed1 south window
    win_v(ax, 32.625, 10.25, 13.5)  # Bath1 ventilator
    win_v(ax, 32.625, 18.5, 22.5)   # Kitchen south window

    # West exterior / bottom horizontal
    win_h(ax,  3.0,   6.0, 0.375)   # Hall west window
    win_h(ax, 19.5,  22.5, 0.375)   # Bed1 west window

    # East exterior / top horizontal
    win_h(ax,  4.0,   7.5, 32.625)  # Bed2 east window
    win_h(ax, 18.5,  22.5, 32.625)  # Kitchen east window

    # ══════════════════════════════════════════════════════
    # 6. DOORS
    # ══════════════════════════════════════════════════════

    # Main entrance (hinge at rx=9.5, panel to rx=13.0, swings UP into Hall)
    door_in_hwall(ax, rx_hinge=9.5,  rx_far=13.0,  ry=0.375, swing='up')

    # Hall → Bed1 (hinge at ry=12.5, panel to ry=15.5, swings RIGHT into Bed1)
    door_in_vwall(ax, rx=16.5, ry_hinge=12.5, ry_far=15.5, swing='right')

    # Hall → Bed2 (hinge at rx=1.5, panel to rx=4.5, swings UP into Bed2)
    door_in_hwall(ax, rx_hinge=1.5, rx_far=4.5, ry=16.5, swing='up')

    # Hall → Pooja (hinge at ry=13.5, panel to ry=15.5, swings RIGHT into Pooja)
    door_in_vwall(ax, rx=4.75, ry_hinge=13.5, ry_far=15.5, swing='right')

    # Bed1 → Bath1 (hinge at rx=27.0, panel to rx=29.5, swings UP into Bath1)
    door_in_hwall(ax, rx_hinge=27.0, rx_far=29.5, ry=10.25, swing='up')

    # Bed2 → Bath2 (hinge at ry=23.0, panel to ry=25.5, swings LEFT into Bath2)
    door_in_vwall(ax, rx=6.75, ry_hinge=23.0, ry_far=25.5, swing='left')

    # ══════════════════════════════════════════════════════
    # 7. KITCHEN COUNTER  (L-shape along South + East inner walls)
    # ══════════════════════════════════════════════════════
    # South strip (along right/South interior wall, rx up to ~30.25)
    fill(ax, 30.25, 16.75, 32.25, 30.25,
         fc='white', ec='black', ls='-', lw=0.9, z=3)
    # East strip (along top/East interior wall, ry up to ~30.25)
    fill(ax, 16.75, 30.25, 30.25, 32.25,
         fc='white', ec='black', ls='-', lw=0.9, z=3)
    txt(ax, 24.5, 31.0, "వంటగది వేదిక (Counter)", size=7, weight='normal')

    # ══════════════════════════════════════════════════════
    # 8. FRONT PORCH PILLARS
    # ══════════════════════════════════════════════════════
    for px in [1.25, 8.5, 15.75]:
        pillar(ax, px, -2.75)

    # ══════════════════════════════════════════════════════
    # 9. COMPASS DIRECTION LABELS (outside the house boundary)
    # ══════════════════════════════════════════════════════
    txt(ax, 16.5, 36.5, "▲  తూర్పు (East)  ▲",     size=11, weight='bold')
    txt(ax, 16.5, -7.0, "▼  పడమర (West) — ముఖద్వారం  ▼", size=11, weight='bold')
    txt(ax, -5.5, 16.5, "◀  ఉత్తరం\n(North)", size=10, weight='bold')
    txt(ax, 38.5, 16.5, "దక్షిణం ▶\n(South)", size=10, weight='bold')

    # ══════════════════════════════════════════════════════
    # 10. VASTU CORNER MARKERS
    # ══════════════════════════════════════════════════════
    txt(ax,  2.0,  2.0, "వాయువ్యం\n(NW)\nహాలు ✅",   size=7, color='black')
    txt(ax, 30.5,  2.0, "నైరుతి\n(SW)\nపడకగది 1 ✅", size=7, color='black')
    txt(ax,  2.0, 31.0, "ఈశాన్యం\n(NE)\nపడకగది 2 ⚠",size=7, color='black')
    txt(ax, 30.5, 31.0, "ఆగ్నేయం\n(SE)\nవంటగది ✅",  size=7, color='black')

    # ══════════════════════════════════════════════════════
    # 11. TITLE
    # ══════════════════════════════════════════════════════
    txt(ax, 16.5, 39.5,
        "1,089 చ.అ. వాస్తు సంపూర్ణ పశ్చిమ ముఖ ఇల్లు — ఒంగోలు",
        size=13, weight='bold')
    txt(ax, 16.5, 38.0,
        "33' × 33'  |  పశ్చిమ ముఖద్వారం  |  2 పడకగదులు + వంటగది + చావడి",
        size=9, weight='normal')

    # ══════════════════════════════════════════════════════
    # 12. LEGEND BOX
    # ══════════════════════════════════════════════════════
    legend = (
        "గోడల కొలతలు:\n"
        "  బాహ్య గోడ   : 9\" (0.75 అడు.)\n"
        "  అంతర్గత గోడ : 6\" (0.50 అడు.)\n\n"
        "మొత్తం వైశాల్యం:\n"
        "  ప్రధాన ఇల్లు  : 1,089 చ.అ.\n"
        "  చిన్న పంచ     :    62 చ.అ.\n"
        "  మొత్తం          : 1,151 చ.అ."
    )
    ax.text(-7.5, -8.5, legend, fontsize=8, color='black',
            ha='left', va='bottom',
            bbox=dict(boxstyle='round,pad=0.5', fc='white', ec='black', lw=1.0),
            zorder=10)

    # ══════════════════════════════════════════════════════
    # 13. OUTER DIMENSION LINES
    # ══════════════════════════════════════════════════════
    # Bottom dimension (total width)
    ax.annotate('', xy=(32.25, -5.5), xytext=(0.75, -5.5),
                arrowprops=dict(arrowstyle='<->', color='black', lw=1.0))
    dim_txt(ax, 16.5, -5.5, "33' 0\" (మొత్తం వెడల్పు)")

    # Left dimension (total height)
    ax.annotate('', xy=(-4.5, 32.25), xytext=(-4.5, 0.75),
                arrowprops=dict(arrowstyle='<->', color='black', lw=1.0))
    dim_txt(ax, -4.5, 16.5, "33' 0\" (మొత్తం పొడవు)", size=8)

    # ══════════════════════════════════════════════════════
    # SAVE
    # ══════════════════════════════════════════════════════
    SVG = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_final.svg"
    PNG = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_final.png"
    plt.savefig(SVG, bbox_inches='tight', dpi=150)
    plt.close()
    try:
        subprocess.run(["/home/teja/.local/bin/cairosvg", SVG, "-o", PNG], check=True)
        print("✅ Clean Vastu floor plan generated!")
    except Exception as e:
        print(f"CairoSVG: {e}")

if __name__ == "__main__":
    generate()
