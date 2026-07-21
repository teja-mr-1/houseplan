import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import subprocess

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Noto Sans Telugu', 'DejaVu Sans', 'Liberation Sans']
plt.rcParams['svg.fonttype'] = 'none'

def generate():
    fig, ax = plt.subplots(figsize=(14, 16))
    ax.set_aspect('equal')
    ax.set_xlim(-5, 46)
    ax.set_ylim(-5, 52)
    ax.axis('off')

    # 1. Plot Boundary
    ax.add_patch(mpatches.Rectangle((0,0), 41, 45, facecolor='#f4f9f1', edgecolor='#2e7d32', ls='--', lw=2))

    # 2. House Background (white, inside plot)
    ax.add_patch(mpatches.Rectangle((5.0, 4.0), 34.0, 32.0, facecolor='#ffffff', edgecolor='none'))

    # 3. Walls (drawn as solid geometric blocks, ZERO overlaps)
    wall_color = '#2c3e50'
    walls = [
        # South exterior (full width)
        (5.0, 4.0, 34.0, 0.75),
        # North exterior (full width)
        (5.0, 35.25, 34.0, 0.75),
        # West exterior (segments between doors/corners)
        (5.0, 4.75, 0.75, 20.25),   # 4.75 to 25.0
        (5.0, 29.0, 0.75, 6.25),    # 29.0 to 35.25
        # East exterior (continuous)
        (38.25, 4.75, 0.75, 30.5),  # 4.75 to 35.25
        
        # Interior horizontal (segments between doors/archways)
        (5.75, 16.75, 7.25, 0.5),   # 5.75 to 13.0
        (16.0, 16.75, 1.0, 0.5),    # 16.0 to 17.0
        (20.0, 16.75, 8.0, 0.5),    # 20.0 to 28.0
        (32.0, 16.75, 6.25, 0.5),   # 32.0 to 38.25
        
        # Interior verticals (between horizontal walls)
        (16.25, 4.75, 0.5, 12.0),   # 4.75 to 16.75
        (26.75, 4.75, 0.5, 12.0)    # 4.75 to 16.75
    ]
    for x, y, w, h in walls:
        ax.add_patch(mpatches.Rectangle((x,y), w, h, facecolor=wall_color, edgecolor='none'))

    # 4. Windows (drawn accurately over walls with white backgrounds to stay clean)
    def draw_window(x1, x2, y1, y2):
        ax.add_patch(mpatches.Rectangle((x1, y1), x2-x1, y2-y1, facecolor='#ffffff', edgecolor='black', lw=1.2))
        if x2 - x1 > y2 - y1:
            mid = (y1+y2)/2
            ax.plot([x1, x2], [mid, mid], color='black', lw=1.2)
        else:
            mid = (x1+x2)/2
            ax.plot([mid, mid], [y1, y2], color='black', lw=1.2)

    draw_window(8.0, 13.0, 4.0, 4.75)    # Bed 1 South
    draw_window(5.0, 5.75, 8.0, 13.0)    # Bed 1 West
    draw_window(19.0, 24.0, 4.0, 4.75)   # Bed 2 South
    draw_window(30.0, 35.0, 4.0, 4.75)   # Kitchen South
    draw_window(38.25, 39.0, 8.0, 13.0)  # Kitchen East
    draw_window(38.25, 39.0, 24.0, 29.0) # Hall East
    draw_window(12.0, 18.0, 35.25, 36.0) # Hall North 1
    draw_window(24.0, 30.0, 35.25, 36.0) # Hall North 2
    draw_window(5.0, 5.75, 19.0, 23.0)   # Hall West

    # 5. Doors (with clean arcs)
    # Main Entrance
    ax.plot([5.75, 9.75], [29.0, 29.0], color='black', lw=2)
    ax.add_patch(mpatches.Arc((5.75, 29.0), 8.0, 8.0, angle=0, theta1=270, theta2=360, color='black', ls='--'))
    # Bed 1
    ax.plot([13.0, 13.0], [16.75, 13.75], color='black', lw=2)
    ax.add_patch(mpatches.Arc((13.0, 16.75), 6.0, 6.0, angle=0, theta1=270, theta2=360, color='black', ls='--'))
    # Bed 2
    ax.plot([20.0, 20.0], [16.75, 13.75], color='black', lw=2)
    ax.add_patch(mpatches.Arc((20.0, 16.75), 6.0, 6.0, angle=0, theta1=180, theta2=270, color='black', ls='--'))

    # 6. Room Labels & Dimensions
    def label(x, y, title, dims):
        ax.text(x, y, title, fontsize=12, fontweight='bold', ha='center', va='center', color='#111111')
        ax.text(x, y-1.5, dims, fontsize=10, color='#c0392b', fontweight='bold', ha='center', va='center')

    label(11.0, 11.5, "పడకగది 1\n(Bed 1 - నైరుతి)", "10'6\" × 12'0\"")
    label(21.75, 11.5, "పడకగది 2\n(Bed 2 - దక్షిణం)", "10'0\" × 12'0\"")
    label(32.75, 11.5, "వంటగది\n(Kitchen - ఆగ్నేయం)", "11'0\" × 12'0\"")
    label(22.0, 27.5, "చావడి / హాలు\n(Hall - వాయువ్యం / ఉత్తరం)", "32'6\" × 18'0\"")

    ax.text(30.0, 17.0, "కమాను\n(Arch)", fontsize=9, color='#555555', ha='center', va='center')

    # 7. Setbacks (Empty Land)
    ax.text(20.5, 40.5, "ఉత్తరం ఖాళీ స్థలం (North Setback) - 9' 0\"", fontsize=11, color='#2e7d32', ha='center', va='center')
    ax.text(20.5, 2.0, "దక్షిణం ఖాళీ స్థలం (South Setback) - 4' 0\"", fontsize=11, color='#2e7d32', ha='center', va='center')
    ax.text(2.5, 20.5, "పడమర\n(West)\n\n5' 0\"", fontsize=11, color='#2e7d32', ha='center', va='center')
    ax.text(40.0, 20.5, "తూర్పు\n(East)\n\n2' 0\"", fontsize=11, color='#2e7d32', ha='center', va='center')

    # Main Entrance Arrow
    ax.annotate('ముఖద్వారం\n(Main Entrance)', xy=(5.0, 27.0), xytext=(-2.0, 27.0),
                arrowprops=dict(facecolor='black', shrink=0.05, width=1.5, headwidth=6),
                fontsize=11, fontweight='bold', ha='right', va='center')

    # 8. Compass Directions
    ax.text(20.5, 46.5, "ఉత్తరం (NORTH)", fontsize=13, fontweight='bold', ha='center', va='center')
    ax.text(20.5, -2.5, "దక్షిణం (SOUTH)", fontsize=13, fontweight='bold', ha='center', va='center')
    ax.text(-3.5, 20.5, "పడమర\n(WEST)", fontsize=13, fontweight='bold', ha='center', va='center')
    ax.text(44.5, 20.5, "తూర్పు\n(EAST)", fontsize=13, fontweight='bold', ha='center', va='center')

    # 9. Measurement Lines
    ax.annotate('', xy=(0, -0.5), xytext=(41, -0.5), arrowprops=dict(arrowstyle='<->', color='#1565c0'))
    ax.text(20.5, -1.2, "ప్లాట్ వెడల్పు: 41' 0\"", color='#1565c0', fontweight='bold', ha='center', va='center')

    ax.annotate('', xy=(-0.5, 0), xytext=(-0.5, 45), arrowprops=dict(arrowstyle='<->', color='#1565c0'))
    ax.text(-1.2, 22.5, "ప్లాట్ పొడవు: 45' 0\"", color='#1565c0', fontweight='bold', ha='center', va='center', rotation=90)

    ax.annotate('', xy=(5.0, 3.2), xytext=(39.0, 3.2), arrowprops=dict(arrowstyle='<->', color='#c0392b'))
    ax.text(22.0, 2.5, "ఇంటి వెడల్పు (House Width): 34' 0\"", color='#c0392b', fontweight='bold', ha='center', va='center')

    ax.annotate('', xy=(39.8, 4.0), xytext=(39.8, 36.0), arrowprops=dict(arrowstyle='<->', color='#c0392b'))
    ax.text(40.5, 20.0, "ఇంటి పొడవు (House Length): 32' 0\"", color='#c0392b', fontweight='bold', ha='center', va='center', rotation=270)

    # 10. Title
    ax.text(20.5, 50.0, "1088 చ.అ. పశ్చిమ ముఖ ఇల్లు (1100 sqft West Facing)", fontsize=16, fontweight='bold', ha='center', va='center')
    ax.text(20.5, 48.5, "స్థలం కొలతలు: 41' (వెడల్పు) × 45' (పొడవు) | 2 పడకగదులు, 1 వంటగది, విశాలమైన హాలు", fontsize=12, ha='center', va='center')

    SVG = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_new_1100.svg"
    PNG = "/mnt/linuxdata/fraud-brain/houseplan/floor_plan_new_1100.png"
    plt.savefig(SVG, bbox_inches='tight', dpi=150)
    plt.close()
    subprocess.run(["/home/teja/.local/bin/cairosvg", SVG, "-o", PNG], check=True)

if __name__ == "__main__":
    generate()
