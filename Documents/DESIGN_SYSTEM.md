# Cricket Mela - Visual Design Guide 🎨

## Typography Scale

### Headings
```
H1: 36px, Poppins Bold, -1px letter-spacing (Page titles)
H2: 28px, Poppins SemiBold, -0.5px letter-spacing (Section titles)
H3: 20px, Poppins SemiBold (Card titles)
```

### Body Text
```
Primary: 14px, Inter Regular (Default body text)
Secondary: 13px, Inter Medium (Table data, labels)
Small: 12px, Inter Regular (Captions, helpers)
Tiny: 11px, Inter SemiBold (Badges, tags)
```

## Component Styles

### Tables
**Header Row**:
- Background: Purple gradient (667eea → 764ba2)
- Text: White, 12px, uppercase, 0.5px spacing
- Padding: 14px 12px

**Body Rows**:
- Alternating: #fafbfc / white
- Hover: #f5f7fa
- Text: 13px, #2d3748
- Padding: 14px 12px

**Container**:
- Background: White
- Border: 1px solid #e8e8e8
- Border-radius: 12-16px
- Shadow: 0 2px 10px rgba(0,0,0,0.08)

### Buttons

**Primary (Gradient)**:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
color: white
padding: 14px 20px
border-radius: 10px
font: 600 14px Inter
letter-spacing: 0.5px
shadow: 0 4px 15px rgba(102, 126, 234, 0.4)
```

**Hover State**:
```css
transform: translateY(-2px)
shadow: 0 6px 20px rgba(102, 126, 234, 0.6)
```

### Cards

**Season Cards**:
```css
background: white
border-radius: 20px
padding: 40px 30px
shadow: 0 10px 30px rgba(0,0,0,0.1)
border: 3px solid transparent

Hover:
transform: translateY(-10px) scale(1.05)
border: 3px solid #2ecc71
shadow: 0 20px 60px rgba(46, 204, 113, 0.3)
```

**Form Cards**:
```css
background: white
border-radius: 16px
padding: 30px
shadow: 0 4px 20px rgba(0,0,0,0.08)
border: 1px solid #e8e8e8
```

### Input Fields
```css
padding: 12px 14px
border: 1px solid #e2e8f0
border-radius: 10px
font: 14px Inter
background: white

Focus:
border-color: #667eea
outline: none
```

### Badges

**Status Badges**:
```css
Won: bg #f0fff4, text #38a169, border #c6f6d5
Lost: bg #fff5f5, text #e53e3e
Pending: bg #fffaf0, text #ed8936
Live: bg #667eea, text white
```

**Role Badges**:
```css
Admin: bg #E91E8C, text white
Player: bg #667eea, text white
padding: 4px 12px
border-radius: 8px
font: 600 11px Inter, uppercase
```

## Spacing System

### Padding Scale
```
Tight: 4px, 6px, 8px
Normal: 12px, 14px, 16px
Relaxed: 20px, 25px, 30px
Loose: 40px, 50px
```

### Margin Scale
```
Small: 8px, 10px
Medium: 15px, 20px
Large: 25px, 30px
XL: 40px
```

### Gap (Flexbox/Grid)
```
Tight: 6px, 8px
Normal: 10px, 12px
Comfortable: 15px, 18px
Spacious: 20px, 30px
```

## Border Radius

```
Small: 6px, 8px (inputs, small badges)
Medium: 10px, 12px (buttons, cards)
Large: 16px, 20px (main cards, containers)
Round: 50% (avatars, icons)
```

## Shadows

### Elevation Levels
```css
Level 1: 0 2px 10px rgba(0,0,0,0.08)  /* Cards */
Level 2: 0 4px 20px rgba(0,0,0,0.08)  /* Modals */
Level 3: 0 10px 30px rgba(0,0,0,0.1)  /* Elevated cards */
Level 4: 0 20px 60px rgba(46, 204, 113, 0.3)  /* Hover states */
```

### Colored Shadows
```css
Purple: 0 4px 15px rgba(102, 126, 234, 0.4)
Green: 0 20px 60px rgba(46, 204, 113, 0.3)
```

## Transitions

### Standard Timing
```css
Fast: 0.2s ease
Normal: 0.3s ease
Slow: 0.4s ease
Animation: 2s infinite (bounce)
```

## Icons & Emojis

### Used Icons
- 🏏 Cricket bat (main theme, seasons)
- 🏆 Trophy (standings, winners)
- 📊 Chart (statistics, vote history)
- 👤 User (profile)
- 🥇🥈🥉 Medals (rankings)
- ✅ Check (won)
- ❌ Cross (lost)
- ⏳ Hourglass (pending)

## Gradients

### Primary Gradient
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
```

### Alternative Gradients (unused, for future)
```css
Green: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)
Blue: linear-gradient(135deg, #3498db 0%, #2980b9 100%)
Orange: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)
```

## Hover States

### Interactive Elements
- **Buttons**: Translate Y(-2px), increase shadow
- **Cards**: Scale(1.05), Translate Y(-10px)
- **Table Rows**: Background color change
- **Links**: Color change, underline

## Mobile Optimizations

### Responsive Breakpoints
```css
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

### Touch Targets
- Minimum size: 40x40px
- Comfortable tap spacing: 8px gaps
- Larger font on mobile: +1-2px

## Loading States

```css
Skeleton: background #f5f5f5, animated shimmer
Spinner: Purple (#667eea), 40px diameter
Disabled: opacity 0.6, cursor not-allowed
```

---

**Design System Version**: 2.0
**Last Updated**: February 2026
**Maintained By**: Cricket Mela Team

