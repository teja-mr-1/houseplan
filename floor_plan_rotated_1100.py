import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import subprocess

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Noto Sans Telugu', 'DejaVu Sans', 'Liberation Sans']
plt.rcParams['svg.fonttype'] = 'none'

def generate():
    fig, ax = plt.subplots(figsize=(16, 14)) 
    ax.set_aspect('equal')
    ax.set_xlim(-8, 52)
    ax.set_ylim(-8, 52)
    ax.axis('off')

    # 1. Plot Boundary
    ax.add_patch(mpatches.Rectangle((0,0), 45, 41, facecolor='#f4f9f1', edgecolor='#2e7d32', ls='--', lw=2))

    # 2. House Background
    ax.add_patch(mpatches.Rectangle((14.0, 4.0), 31.0, 37.0, facecolor='#ffffff', edgecolor='none'))

    # 3. Walls
    wall_color = '#2c3e50'
    walls = [
        # North exterior (Left vertical)
        (14.0, 4.0, 0.75, 37.0),
        # South exterior (Right vertical)
        (44.25, 4.0, 0.75, 37.0),
        # West exterior (Bottom horizontal segments)
        (14.75, 4.0, 7.25, 0.75),   # X = 14.75 to 22.0
        (26.0, 4.0, 18.25, 0.75),   # X = 26.0 to 44.25
        # East exterior (Top horizontal)
        (14.75, 40.25, 29.5, 0.75), # X = 14.75 to 44.25
        
        # Interior vertical
        (27.75, 4.75, 0.50, 8.25),   # Y = 4.75 to 13.0
        (27.75, 16.0, 0.50, 1.25),   # Y = 16.0 to 17.25
        (27.75, 21.0, 0.50, 9.25),   # Y = 21.0 to 30.25
        (27.75, 35.25, 0.50, 5.0),   # Y = 35.25 to 40.25
        
        # Interior horizontal
        (28.25, 16.75, 16.0, 0.50),  # Bed 1 / Bed 2
        (28.25, 29.75, 16.0, 0.50)   # Bed 2 / Kitchen
    ]
    for x, y, w, h in walls:
        ax.add_patch(mpatches.Rectangle((x,y), w, h, facecolor=wall_color, edgecolor='none'))

    # 4. Windows
    def draw_window(x1, x2, y1, y2):
        ax.add_patch(mpatches.Rectangle((x1, y1), x2-x1, y2-y1, facecolor='#ffffff', edgecolor='black', lw=1.2))
        if x2 - x1 > y2 - y1:
            mid = (y1+y2)/2
            ax.plot([x1, x2], [mid, mid], color='black', lw=1.2)
        else:
            mid = (x1+x2)/2
            ax.plot([mid, mid], [y1, y2], color='black', lw=1.2)

    # North Exterior
    draw_window(14.0, 14.75, 15.0, 20.0)
    draw_window(14.0, 14.75, 26.0, 31.0)
    # South Exterior
    draw_window(44.25, 45.0, 10.0, 15.0)
    draw_window(44.25, 45.0, 22.0, 27.0)
    draw_window(44.25, 45.0, 33.0, 38.0)
    # West Exterior
    draw_window(35.0, 40.0, 4.0, 4.75)
    draw_window(16.0, 20.0, 4.0, 4.75)
    # East Exterior
    draw_window(35.0, 40.0, 40.25, 41.0)
    draw_window(20.0, 26.0, 40.25, 41.0)

    # 5. Doors
    # Main Entrance
    ax.plot([22.0, 22.0], [4.75, 8.75], color='black', lw=2)
    ax.add_patch(mpatches.Arc((22.0, 4.75), 8.0, 8.0, angle=0, theta1=0, theta2=90, color='black', ls='--'))
    # Bed 1
    ax.plot([28.25, 31.25], [16.0, 16.0], color='black', lw=2)
    ax.add_patch(mpatches.Arc((28.25, 16.0), 6.0, 6.0, angle=0, theta1=270, theta2=360, color='black', ls='--'))
    # Bed 2
    ax.plot([28.25, 31.25], [18.0, 18.0], color='black', lw=2)
    ax.add_patch(mpatches.Arc((28.25, 18.0), 6.0, 6.0, angle=0, theta1=0, theta2=90, color='black', ls='--'))

    # 6. Labels
    def label(x, y, title, dims):
        ax.text(x, y, title, fontsize=12, fontweight='bold', ha='center', va='center', color='#111111')
        ax.text(x, y-1.5, dims, fontsize=10, color='#c0392b', fontweight='bold', ha='center', va='center')

    label(36.25, 10.75, "పడకగది 1\n(Bed 1 - నైరుతి)", "16'0\" × 12'0\"")
    label(36.25, 23.5, "పడకగది 2\n(Bed 2 - దక్షిణం)", "16'0\" × 12'6\"")
    label(36.25, 35.25, "వంటగది\n(Kitchen - ఆగ్నేయం)", "16'0\" × 10'0\"")
    label(21.25, 22.5, "చావడి / హాలు\n(Hall - వాయువ్యం / ఉత్తరం)", "13'0\" × 35'6\"")
    ax.text(28.0, 33.25, "కమాను\n(Arch)", fontsize=9, color='#555555', ha='center', va='center')

    # 7. Setbacks
    ax.text(7.0, 23.0, "ఉత్తరం ఖాళీ స్థలం\n(North Setback)\n14' 0\"", fontsize=11, color='#2e7d32', ha='center', va='center')
    ax.text(18.0, 2.0, "పడమర ఖాళీ స్థలం (West Setback) - 4' 0\"", fontsize=11, color='#2e7d32', ha='center', va='center')

    ax.annotate('ముఖద్వారం\n(Main Entrance)', xy=(24.0, 4.0), xytext=(24.0, -0.5),
                arrowprops=dict(facecolor='black', shrink=0.05, width=1.5, headwidth=6),
                fontsize=11, fontweight='bold', ha='center', va='top')

    # 8. Compass
    ax.text(-5.0, 20.5, "ఉత్తరం (NORTH)", fontsize=13, fontweight='bold', ha='center', va='center', rotation=90)
    ax.text(48.0, 20.5, "దక్షిణం (SOUTH)", fontsize=13, fontweight='bold', ha='center', va='center', rotation=270)
    ax.text(22.5, -5.0, "పడమర (WEST)", fontsize=13, fontweight='bold', ha='center', va='center')
    ax.text(22.5, 45.0, "తూర్పు (EAST)", fontsize=13, fontweight='bold', ha='center', va='center')

    # 9. Dimensions
    ax.annotate('', xy=(0, 42.5), xytext=(45, 42.5), arrowprops=dict(arrowstyle='<->', color='#1565c0'))
    ax.text(22.5, 43.5, "ప్లాట్ పొడవు (N to S): 45' 0\"", color='#1565c0', fontweight='bold', ha='center', va='center')

    ax.annotate('', xy=(-2.0, 0), xytext=(-2.0, 41), arrowprops=dict(arrowstyle='<->', color='#1565c0'))
    ax.text(-3.0, 20.5, "ప్లాట్ వెడల్పు (W to E): 41' 0\"", color='#1565c0', fontweight='bold', ha='center', va='center', rotation=90)

    ax.annotate('', xy=(14.0, 2.5), xytext=(45.0, 2.5), arrowprops=dict(arrowstyle='<->', color='#c0392b'))
    ax.text(35.0, 2.0, "ఇంటి పొడవు (House Length): 31' 0\"", color='#c0392b', fontweight='bold', ha='center', va='center')

    ax.annotate('', xy=(12.5, 4.0), xytext=(12.5, 41.0), arrowprops=dict(arrowstyle='<->', color='#c0392b'))
    ax.text(11.5, 23.0, "ఇంటి వెడల్పు (House Width): 37' 0\"", color='#c0392b', fontweight='bold', ha='center', va='center', rotation=90)

    # 10. Title
    ax.text(22.5, 50.0, "1147 చ.అ. పశ్చిమ ముఖ ఇల్లు (1147 sqft West Facing)", fontsize=16, fontweight='bold', ha='center', va='center')
    ax.text(22.5, 48.5, "స్థలం కొలతలు: 41' (వెడల్పు) × 45' (పొడవు) | సున్నా ఖాళీ స్థలం (దక్షిణం, తూర్పు)", fontsize=12, ha='center', va='center')

    SVG = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_rotated_1100.svg"
    PNG = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_rotated_1100.png"
    plt.savefig(SVG, bbox_inches='tight', dpi=150)
    plt.close()
    subprocess.run(["/home/teja/.local/bin/cairosvg", SVG, "-o", PNG], check=True)

if __name__ == "__main__":
    generate()
