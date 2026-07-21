import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import math
import warnings
import subprocess

# Suppress Matplotlib's UserWarnings regarding font fallbacks
warnings.filterwarnings("ignore", category=UserWarning)

# Configure Matplotlib to use Noto Sans Telugu with standard fallbacks for Latin/symbol glyphs
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Noto Sans Telugu', 'DejaVu Sans', 'Liberation Sans', 'Arial']
plt.rcParams['axes.unicode_minus'] = False  # Avoid warning for minus signs
plt.rcParams['svg.fonttype'] = 'none'       # Keep text as text nodes in SVG for external shaping

# ----------------------------------------------------------------------
# Geometry / Grid System (Dimensions in feet)
# ----------------------------------------------------------------------
# Total Footprint: 33.0 ft (Width) x 33.0 ft (Height) = 1,089 sq.ft
# External Walls: 9 inches (0.75 ft) thick
# Partition/Internal Walls: 6 inches (0.50 ft) thick
#
# Rotation Mapping (90 degrees anti-clockwise about center):
# X_new = 33.0 - Y_old
# Y_new = X_old

T_EXT = 0.75
T_INT = 0.50

# Monochromatic Colors
COLOR_WALL = "black"
COLOR_DOOR = "black"
COLOR_WINDOW = "black"
COLOR_TEXT_ROOM = "black"
COLOR_TEXT_VASTU = "black"
COLOR_PILLAR_BASE = "white"
COLOR_PILLAR_POST = "white"
COLOR_NUMBERS = "#c0392b"     # Crimson Red for numerical dimensions

# ----------------------------------------------------------------------
# Drawing Utility Functions (With 90-deg CCW rotation applied)
# ----------------------------------------------------------------------

def rot_coord(x, y):
    """Transforms coordinates 90 degrees anti-clockwise."""
    return 33.0 - y, x

def draw_room(ax, x, y, w, h, name, dimensions_str, face_color, border_style='-', border_color='none'):
    """
    Draws a room's background color, name, and dimensions, rotated 90-deg CCW.
    """
    # Rotated bounds
    rx, ry = 33.0 - y - h, x
    rw, rh = h, w
    
    rect = mpatches.Rectangle((rx, ry), rw, rh, facecolor=face_color, edgecolor=border_color, 
                              linestyle=border_style, alpha=0.75, zorder=1)
    ax.add_patch(rect)
    
    # Rotated center
    cx, cy = 33.0 - (y + h / 2.0), x + w / 2.0
    
    font_size_name = 9.5 if w >= 8.0 else (8 if w >= 4.0 else 6.5)
    font_size_dim = 8 if w >= 8.0 else 6.5
    
    # Dynamically adjust text line spacing to prevent overlaps of Telugu conjuncts/vattulu
    offset_name = rh * 0.06 if rh >= 10 else 0.5
    offset_dim = rh * 0.10 if rh >= 10 else 0.7
    
    if dimensions_str:
        ax.text(cx, cy + offset_name, name, fontsize=font_size_name, fontweight='bold',
                color=COLOR_TEXT_ROOM, ha='center', va='center', zorder=6)
        ax.text(cx, cy - offset_dim, dimensions_str, fontsize=font_size_dim,
                color=COLOR_NUMBERS, ha='center', va='center', zorder=6)
    else:
        ax.text(cx, cy, name, fontsize=font_size_name, fontweight='bold',
                color=COLOR_TEXT_ROOM, ha='center', va='center', zorder=6)

def draw_wall(ax, x1, y1, x2, y2, thickness, color=COLOR_WALL):
    """
    Draws a wall segment, rotated 90-deg CCW. Uses hollow architectural style.
    """
    rx1, ry1 = 33.0 - y1, x1
    rx2, ry2 = 33.0 - y2, x2
    
    if abs(rx1 - rx2) < 1e-5:  # Vertical wall in rotated coords
        ymin, ymax = min(ry1, ry2), max(ry1, ry2)
        rect = mpatches.Rectangle((rx1 - thickness/2.0, ymin), thickness, ymax - ymin, 
                                  facecolor='white', edgecolor=color, linewidth=1.2, zorder=3)
        ax.add_patch(rect)
    elif abs(ry1 - ry2) < 1e-5:  # Horizontal wall in rotated coords
        xmin, xmax = min(rx1, rx2), max(rx1, rx2)
        rect = mpatches.Rectangle((xmin, ry1 - thickness/2.0), xmax - xmin, thickness, 
                                  facecolor='white', edgecolor=color, linewidth=1.2, zorder=3)
        ax.add_patch(rect)

def draw_door(ax, x, y, x_c, y_c, swing_dir='left', color=COLOR_DOOR, thickness=1.8):
    """
    Draws a door hinge, closed position, and swing arc, rotated 90-deg CCW.
    """
    rx, ry = 33.0 - y, x
    rx_c, ry_c = 33.0 - y_c, x_c
    
    L = math.hypot(rx_c - rx, ry_c - ry)
    theta_c = math.atan2(ry_c - ry, rx_c - rx)
    
    if swing_dir == 'left':
        theta_o = theta_c + math.pi/2.0
    else:
        theta_o = theta_c - math.pi/2.0
        
    rx_o = rx + L * math.cos(theta_o)
    ry_o = ry + L * math.sin(theta_o)
    
    # Door panel line
    ax.plot([rx, rx_o], [ry, ry_o], color=color, linewidth=thickness, zorder=4)
    
    t1 = math.degrees(theta_c) % 360
    t2 = math.degrees(theta_o) % 360
    
    if t2 < t1:
        if abs(t2 - t1) > 180:
            theta1, theta2 = t1, t2 + 360
        else:
            theta1, theta2 = t2, t1
    else:
        if abs(t2 - t1) > 180:
            theta1, theta2 = t2, t1 + 360
        else:
            theta1, theta2 = t1, t2
            
    arc = mpatches.Arc((rx, ry), 2*L, 2*L, angle=0, theta1=theta1, theta2=theta2,
                       color=color, linestyle=':', linewidth=1.2, zorder=2)
    ax.add_patch(arc)

def draw_window(ax, x1, y1, x2, y2, thickness, color=COLOR_WINDOW):
    """
    Draws a window frame and double glass lines, rotated 90-deg CCW.
    """
    rx1, ry1 = 33.0 - y1, x1
    rx2, ry2 = 33.0 - y2, x2
    
    if abs(rx1 - rx2) < 1e-5:  # Vertical window in rotated coords
        ymin, ymax = min(ry1, ry2), max(ry1, ry2)
        w_thick = thickness * 0.8
        rect = mpatches.Rectangle((rx1 - w_thick/2.0, ymin), w_thick, ymax - ymin, 
                                  facecolor='white', edgecolor='black', linewidth=0.8, zorder=4)
        ax.add_patch(rect)
        ax.plot([rx1, rx1], [ymin, ymax], color=color, linewidth=1.5, zorder=5)
        ax.plot([rx1 - w_thick/4.0, rx1 - w_thick/4.0], [ymin, ymax], color='black', linewidth=0.5, zorder=5)
        ax.plot([rx1 + w_thick/4.0, rx1 + w_thick/4.0], [ymin, ymax], color='black', linewidth=0.5, zorder=5)
    elif abs(ry1 - ry2) < 1e-5:  # Horizontal window in rotated coords
        xmin, xmax = min(rx1, rx2), max(rx1, rx2)
        w_thick = thickness * 0.8
        rect = mpatches.Rectangle((xmin, ry1 - w_thick/2.0), xmax - xmin, w_thick, 
                                  facecolor='white', edgecolor='black', linewidth=0.8, zorder=4)
        ax.add_patch(rect)
        ax.plot([xmin, xmax], [ry1, ry1], color=color, linewidth=1.5, zorder=5)
        ax.plot([xmin, xmax], [ry1 - w_thick/4.0, ry1 - w_thick/4.0], color='black', linewidth=0.5, zorder=5)
        ax.plot([xmin, xmax], [ry1 + w_thick/4.0, ry1 + w_thick/4.0], color='black', linewidth=0.5, zorder=5)

def draw_dimension(ax, x1, y1, x2, y2, text, offset=2.0, color='black'):
    """
    Draws dimension lines, ticks, and text, rotated 90-deg CCW.
    """
    rx1, ry1 = 33.0 - y1, x1
    rx2, ry2 = 33.0 - y2, x2
    
    dx = rx2 - rx1
    dy = ry2 - ry1
    length = math.hypot(dx, dy)
    if length == 0:
        return
    
    ux = dx / length
    uy = dy / length
    
    px = -uy
    py = ux
    
    dim_x1 = rx1 + px * offset
    dim_y1 = ry1 + py * offset
    dim_x2 = rx2 + px * offset
    dim_y2 = ry2 + py * offset
    
    ax.plot([dim_x1, dim_x2], [dim_y1, dim_y2], color=color, linewidth=0.8, zorder=5)
    
    gap = 0.2
    ax.plot([rx1 + px * gap, dim_x1], [ry1 + py * gap, dim_y1], color=color, linewidth=0.5, linestyle='--', zorder=5)
    ax.plot([rx2 + px * gap, dim_x2], [ry2 + py * gap, dim_y2], color=color, linewidth=0.5, linestyle='--', zorder=5)
    
    tick_size = 0.4
    ax.plot([dim_x1 - (ux - px) * tick_size, dim_x1 + (ux - px) * tick_size],
            [dim_y1 - (uy - py) * tick_size, dim_y1 + (uy - py) * tick_size],
            color=color, linewidth=1.2, zorder=5)
    ax.plot([dim_x2 - (ux - px) * tick_size, dim_x2 + (ux - px) * tick_size],
            [dim_y2 - (uy - py) * tick_size, dim_y2 + (uy - py) * tick_size],
            color=color, linewidth=1.2, zorder=5)
    
    mid_x = (dim_x1 + dim_x2) / 2.0
    mid_y = (dim_y1 + dim_y2) / 2.0
    
    angle = math.degrees(math.atan2(dy, dx))
    if angle > 90:
        angle -= 180
    elif angle < -90:
        angle += 180
        
    ax.text(mid_x, mid_y, text, color=COLOR_NUMBERS, fontsize=8, fontweight='bold',
            ha='center', va='center', rotation=angle,
            bbox=dict(boxstyle='square,pad=0.2', facecolor='white', edgecolor='none', zorder=6),
            zorder=7)

def draw_north_arrow(ax, x, y, size=1.5):
    """
    Draws a decorative North Arrow pointing Left.
    """
    # Shaft pointing Left
    ax.plot([x + size, x - size], [y, y], color='black', lw=1.5, zorder=5)
    # Arrow head
    ax.plot([x - size*0.4, x - size, x - size*0.4], [y - size*0.4, y, y + size*0.4], color='black', lw=1.5, zorder=5)
    # Circle base
    circle = mpatches.Circle((x, y), size*0.3, facecolor='none', edgecolor='black', lw=0.8, zorder=5)
    ax.add_patch(circle)

# ----------------------------------------------------------------------
# Village-Style Custom Drawing Helpers (With rotation applied)
# ----------------------------------------------------------------------

def draw_pillar(ax, x, y, radius=0.3):
    """Draws a traditional pillar, rotated 90-deg CCW."""
    rx, ry = 33.0 - y, x
    base = mpatches.Circle((rx, ry), radius, facecolor=COLOR_PILLAR_BASE, edgecolor='black', lw=0.8, zorder=5)
    ax.add_patch(base)
    post = mpatches.Circle((rx, ry), radius * 0.7, facecolor=COLOR_PILLAR_POST, edgecolor='black', lw=0.8, zorder=5)
    ax.add_patch(post)

# ----------------------------------------------------------------------
# Main Architectural Rendering Function
# ----------------------------------------------------------------------

def generate_floor_plan():
    fig, ax = plt.subplots(figsize=(11, 11))
    ax.set_aspect('equal')
    
    # Limits expanded for margins
    ax.set_xlim(-8, 41)
    ax.set_ylim(-8, 40)
    ax.axis('off')
    
    # Title (Vastu Compliant Layout)
    ax.text(16.5, 37.2, "1,089 చ.అ. ప్రధాన ఇల్లు మరియు 62 చ.అ. చిన్న పంచ (వాస్తు ప్లాన్)", 
            fontsize=13, fontweight='bold', color='black', ha='center', va='center')
    
    # ------------------------------------------------------------------
    # 1. DRAW ROOMS (BACKGROUND FILTERS - Monochromatic White)
    # ------------------------------------------------------------------
    
    # South Column: Bedroom 1 (SW - Nairutya) & Kitchen & Dining (SE - Agneya)
    draw_room(ax, 0.75, 0.75, 15.5, 15.5, "పడకగది 1\n(నైరుతి - ప్రధాన గది)", "15'6\" x 15'6\"", "white")
    draw_room(ax, 16.75, 0.75, 15.5, 15.5, "వంట మరియు భోజన గది\n(ఆగ్నేయం)", "15'6\" x 15'6\"", "white")
    
    # North Column: Hall / Living Room (NW - Vayavya) & Bedroom 2 (NE - Ishanya)
    draw_room(ax, 0.75, 16.75, 15.5, 15.5, "చావడి\n(వాయువ్యం)", "15'6\" x 15'6\"", "white")
    # Bedroom 2 label shifted slightly right to clear the lobby and bathroom
    draw_room(ax, 16.75, 16.75, 15.5, 15.5, "పడకగది 2\n(ఈశాన్యం)", "11'6\" x 15'6\"", "white")
    
    # Bathrooms (Carved toward center of house for better Vastu)
    # Bath 1: NE corner of Bed 1 (toward center of house, away from SW exterior)
    draw_room(ax, 9.25, 9.25, 7.0, 7.0, "అనుబంధ\nస్నానాల గది 1", "7'0\" x 7'0\"", "white")
    # Bath 2: West-center of Bed 2 just above Lobby (away from NE corner)
    draw_room(ax, 16.75, 20.75, 5.0, 7.0, "అనుబంధ\nస్నానాల గది 2", "5'0\" x 7'0\"", "white")
    
    # Front Sit-out / Thinnai (West of Hall / NW Quadrant)
    draw_room(ax, -3.25, 16.75, 4.0, 15.5, "చిన్న పంచ", "4'0\" x 15'6\"", "white",
              border_style='--', border_color='black')
    
    # Pooja Gadhi (NE corner of Hall - NW Quadrant)
    draw_room(ax, 12.25, 28.25, 4.0, 4.0, "పూజా\nగది", "4' x 4'", "white")
    
    # నడవ - Transition Lobby (Lobby connecting Hall NW and Kitchen SE)
    draw_room(ax, 16.75, 16.75, 4.0, 4.0, "నడవ", "4' x 4'", "white", border_color='black', border_style=':')

    # ------------------------------------------------------------------
    # 2. DRAW WALLS (Hollow style, white fill with black borders)
    # ------------------------------------------------------------------
    
    # --- EXTERIOR WALLS (Thickness = 0.75 ft) ---
    draw_wall(ax, 0.375, 0,     0.375, 4.0,   T_EXT)
    draw_wall(ax, 0.375, 7.0,   0.375, 9.25,  T_EXT)
    draw_wall(ax, 0.375, 9.25,  0.375, 12.0,  T_EXT)  # Bath 1 vent opening
    draw_wall(ax, 0.375, 14.0,  0.375, 16.25, T_EXT)
    draw_wall(ax, 0.375, 16.25, 0.375, 20.0,  T_EXT)
    # Main entrance opening: Y in [20.0, 23.5]
    draw_wall(ax, 0.375, 23.5,  0.375, 26.0,  T_EXT)
    draw_wall(ax, 0.375, 29.0,  0.375, 33.0,  T_EXT)

    draw_wall(ax, 32.625, 0,    32.625, 4.0,  T_EXT)
    draw_wall(ax, 32.625, 8.0,  32.625, 22.0, T_EXT)
    draw_wall(ax, 32.625, 26.0, 32.625, 33.0, T_EXT)

    draw_wall(ax, 0,     0.375, 4.0,   0.375, T_EXT)
    draw_wall(ax, 8.0,   0.375, 22.0,  0.375, T_EXT)
    draw_wall(ax, 26.0,  0.375, 33.0,  0.375, T_EXT)

    draw_wall(ax, 0,     32.625, 4.0,   32.625, T_EXT)
    draw_wall(ax, 8.0,   32.625, 13.0,  32.625, T_EXT)
    draw_wall(ax, 15.0,  32.625, 18.0,  32.625, T_EXT)  # Bath 2 vent opening
    draw_wall(ax, 20.0,  32.625, 22.0,  32.625, T_EXT)
    draw_wall(ax, 26.0,  32.625, 33.0,  32.625, T_EXT)

    # --- INTERIOR WALLS (Thickness = 0.50 ft) ---
    # Center dividing vertical wall (X = 16.5) - solid, no Bed1 opening on Kitchen side
    draw_wall(ax, 16.5, 0,     16.5, 4.0,   T_INT)
    draw_wall(ax, 16.5, 4.0,   16.5, 16.75, T_INT)  # Solid wall Bed1-Kitchen
    draw_wall(ax, 16.5, 20.75, 16.5, 33.0,  T_INT)

    # Center dividing horizontal wall (Y = 16.5) - door opening for Hall→Bed1 at X=[12.0, 15.0] (top of room)
    draw_wall(ax, 0,     16.5, 12.0,  16.5, T_INT)  # Wall before door
    draw_wall(ax, 15.0,  16.5, 16.5,  16.5, T_INT)  # Wall after door
    draw_wall(ax, 20.75, 16.5, 33.0,  16.5, T_INT)

    # Lobby Partition Walls (separates transition lobby from Bed 2)
    draw_wall(ax, 16.75, 20.75, 20.75, 20.75, T_INT)
    draw_wall(ax, 20.75, 16.75, 20.75, 20.75, T_INT)

    # --- BATHROOM PARTITION WALLS (Thickness = 0.50 ft) ---
    # Bath 1 partition (NE corner of Bed 1 - away from SW exterior)
    draw_wall(ax, 9.25, 9.25, 9.25, 16.25, T_INT)   # West boundary of Bath 1
    draw_wall(ax, 9.25, 9.25, 16.25, 9.25, T_INT)   # South boundary of Bath 1

    # Bath 2 partition (West-center of Bed 2, above Lobby - away from NE corner)
    draw_wall(ax, 21.75, 20.75, 21.75, 27.75, T_INT)  # East boundary of Bath 2
    draw_wall(ax, 16.75, 27.75, 21.75, 27.75, T_INT)  # North boundary of Bath 2

    # --- POOJA GADHI PARTITION WALLS (inside Hall, Thickness = 0.35 ft) ---
    draw_wall(ax, 12.25, 28.25, 12.25, 32.25, 0.35)
    draw_wall(ax, 12.25, 28.25, 14.25, 28.25, 0.35)

    # ------------------------------------------------------------------
    # 3. DRAW DOORS (SWING ARCS & OPEN PANELS)
    # ------------------------------------------------------------------
    # Main Entrance (West wall of Hall): Y in [20.0, 23.5]
    draw_door(ax, 0.75, 20.0, 0.75, 23.5, swing_dir='right')

    # Pooja Gadhi Door (South wall of Pooja): X in [14.25, 16.25]
    draw_door(ax, 16.25, 28.25, 14.25, 28.25, swing_dir='right')

    # Bedroom 1 Door (from Hall): X in [12.0, 15.0] on Y = 16.5 (top side of room)
    draw_door(ax, 12.0, 16.5, 15.0, 16.5, swing_dir='right')

    # Bedroom 2 Door (from Lobby): X in [16.75, 19.75] on Y = 20.75
    draw_door(ax, 16.75, 20.75, 19.75, 20.75, swing_dir='left')

    # Bath 1 Door (from Bedroom 1): on south wall of Bath 1, Y=9.25, X=[9.75, 12.25]
    draw_door(ax, 9.75, 9.25, 12.25, 9.25, swing_dir='left')

    # Bath 2 Door (from Bedroom 2): on east wall of Bath 2, X=21.75, Y=[21.5, 24.0]
    draw_door(ax, 21.75, 21.5, 21.75, 24.0, swing_dir='right')

    # ------------------------------------------------------------------
    # 4. DRAW WINDOWS & VENTILATORS (BLACK GLASS FRAME LINES)
    # ------------------------------------------------------------------
    draw_window(ax, 0.375, 4.0, 0.375, 7.0, T_EXT)
    draw_window(ax, 0.375, 26.0, 0.375, 29.0, T_EXT)
    draw_window(ax, 0.375, 12.0, 0.375, 14.0, T_EXT)

    draw_window(ax, 32.625, 4.0, 32.625, 8.0, T_EXT)
    draw_window(ax, 32.625, 22.0, 32.625, 26.0, T_EXT)

    draw_window(ax, 4.0, 0.375, 8.0, 0.375, T_EXT)
    draw_window(ax, 22.0, 0.375, 26.0, 0.375, T_EXT)

    draw_window(ax, 4.0, 32.625, 8.0, 32.625, T_EXT)
    draw_window(ax, 22.0, 32.625, 26.0, 32.625, T_EXT)
    draw_window(ax, 18.0, 32.625, 20.0, 32.625, T_EXT)

    # ------------------------------------------------------------------
    # 5. DRAW VILLAGE STYLE ELEMENTS (PILLARS)
    # ------------------------------------------------------------------
    draw_pillar(ax, -3.25, 16.75)
    draw_pillar(ax, -3.25, 24.5)
    draw_pillar(ax, -3.25, 32.25)
    
    # Kitchen Counter Platform
    rx_c1, ry_c1 = 33.0 - 2.75, 16.75
    rw_c1, rh_c1 = 2.0, 15.5
    rx_c2, ry_c2 = 33.0 - 16.25, 30.25
    rw_c2, rh_c2 = 13.5, 2.0
    
    east_counter = mpatches.Rectangle((rx_c1, ry_c1), rw_c1, rh_c1, facecolor='white', edgecolor='black', lw=0.8, zorder=2)
    north_counter = mpatches.Rectangle((rx_c2, ry_c2), rw_c2, rh_c2, facecolor='white', edgecolor='black', lw=0.8, zorder=2)
    ax.add_patch(east_counter)
    ax.add_patch(north_counter)

    # ------------------------------------------------------------------
    # 6. DRAW DIMENSION LINES (Labeled in Telugu)
    # ------------------------------------------------------------------
    draw_dimension(ax, 0, 0, 33, 0, "33' 0\" (వెడల్పు)", offset=-2.0)
    draw_dimension(ax, 0, 33, 33, 33, "33' 0\" (వెడల్పు)", offset=2.0)
    draw_dimension(ax, 0, 0, 0, 33, "33' 0\" (పొడవు)", offset=-2.0)
    draw_dimension(ax, 33, 0, 33, 33, "33' 0\" (పొడవు)", offset=2.0)

    # Wall Thickness Dimensions
    draw_dimension(ax, 0, 0.75, 0, 0, "9 అంగుళాలు", offset=-0.8, color='black')
    draw_dimension(ax, 8.0, 16.75, 8.0, 16.25, "6 అంగుళాలు", offset=1.5, color='black')

    # Wall specifications legend block in Telugu (bottom-left)
    legend_text = "గోడల కొలతలు:\nబాహ్య గోడలు: 9 అంగుళాలు (0.75 అడు.)\nఅంతర్గత గోడలు: 6 అంగుళాలు (0.50 అడు.)"
    ax.text(-5.0, -7.2, legend_text, fontsize=8, color='black', fontweight='bold',
            ha='left', va='bottom', bbox=dict(boxstyle='round,pad=0.4', facecolor='white', edgecolor='black', lw=0.8, zorder=5),
            zorder=6)

    # ------------------------------------------------------------------
    # 7. DRAW VASTU COMPASS & CORNER INDICATORS
    # ------------------------------------------------------------------
    draw_north_arrow(ax, 16.5, 34.5, size=1.8)
    
    # Corner Vastu Labels in Telugu (Rotated to match new compass directions)
    ax.text(31.0, 2.0, "నైరుతి మూల (SW)\n[భూమి తత్వం - పడకగది 1]", fontsize=7.5, style='italic', color='black', ha='right', va='bottom', zorder=6)
    ax.text(31.0, 31.0, "ఆగ్నేయ మూల (SE)\n[అగ్ని తత్వం - వంటగది]", fontsize=7.5, style='italic', color='black', ha='right', va='top', zorder=6)
    ax.text(2.0, 2.0, "వాయువ్య మూల (NW)\n[వాయు తత్వం - చావడి]", fontsize=7.5, style='italic', color='black', ha='left', va='bottom', zorder=6)
    ax.text(2.0, 31.0, "ఈశాన్య మూల (NE)\n[జల తత్వం - పడకగది 2]", fontsize=7.5, style='italic', color='black', ha='left', va='top', zorder=6)

    # Outer Border Direction Indicators in proper Telugu (Rotated 90-deg CCW)
    ax.text(16.5, 35.5, "▲  తూర్పు  ▲", fontsize=11, fontweight='bold', color='black', ha='center', va='center')
    ax.text(16.5, -5.2, "▼  పడమర  ▼", fontsize=11, fontweight='bold', color='black', ha='center', va='center')
    ax.text(-4.8, 16.5, "◀  ఉత్తరం  ◀", fontsize=11, fontweight='bold', color='black', ha='center', va='center')
    ax.text(37.5, 16.5, "▶  దక్షిణం  ▶", fontsize=11, fontweight='bold', color='black', ha='center', va='center')

    # Save to SVG first
    svg_path = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_vastu.svg"
    png_path = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_vastu.png"
    
    plt.savefig(svg_path, bbox_inches='tight')
    plt.close()
    
    # Use CairoSVG to convert SVG to PNG with correct complex text shaping
    try:
        subprocess.run(["/home/teja/.local/bin/cairosvg", svg_path, "-o", png_path], check=True)
        print("Vastu floor plan successfully generated as SVG and converted to PNG using CairoSVG with correct text shaping!")
    except Exception as e:
        print(f"CairoSVG conversion failed ({e}).")

if __name__ == "__main__":
    generate_floor_plan()
