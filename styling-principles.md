# PracTrac Styling Principles & Design System

## Overview

PracTrac uses a sophisticated **Black Glass Morphism** design system that creates a premium, professional aesthetic perfect for coaching applications. The design emphasizes clarity, functionality, and visual hierarchy while maintaining a sleek, modern appearance.

## Core Design Philosophy

### 🎯 **Design Principles**
1. **Glass-First Architecture** - All components use layered transparency and blur effects
2. **Hard Edge Aesthetic** - Sharp, angular components with 0px border-radius throughout
3. **High Contrast Readability** - Ensure text is always clearly visible against glass backgrounds
4. **Volleyball-Inspired Accents** - Orange as primary accent color reflecting volleyball aesthetics
5. **Minimal Visual Noise** - Clean, uncluttered interfaces that focus attention on important actions

---

## Color Palette

### 🖤 **Glass System Colors**
```css
--glass-primary: rgba(0, 0, 0, 0.85);     /* Deep black glass - main containers */
--glass-secondary: rgba(0, 0, 0, 0.65);   /* Medium black glass - secondary elements */
--glass-tertiary: rgba(0, 0, 0, 0.45);    /* Light black glass - subtle backgrounds */
--glass-overlay: rgba(0, 0, 0, 0.25);     /* Subtle overlays and dividers */
```

### 🏐 **Volleyball-Inspired Accent Colors**
```css
--accent-orange: #FF6B35;    /* PRIMARY - Volleyball orange for main actions */
--accent-blue: #00D4FF;      /* SECONDARY - Electric blue for secondary actions */
--accent-white: #FFFFFF;     /* CONTRAST - Pure white for maximum contrast */
--accent-green: #4ECDC4;     /* SUCCESS - Achievement and positive states */
--accent-amber: #FFD700;     /* WARNING - Attention and warning states */
--accent-red: #FF6B6B;       /* ERROR - Errors and destructive actions */
```

### 📝 **Text Hierarchy**
```css
--text-primary: #FFFFFF;                    /* High importance text - titles, labels */
--text-secondary: rgba(255, 255, 255, 0.85); /* Regular content text */
--text-tertiary: rgba(255, 255, 255, 0.65);  /* Supporting text, descriptions */
--text-disabled: rgba(255, 255, 255, 0.35);  /* Disabled states */
```

### ✨ **Glass Effects**
```css
--glass-border: rgba(255, 255, 255, 0.1);     /* Standard glass borders */
--glass-border-light: rgba(255, 255, 255, 0.05); /* Subtle internal borders */
--glass-glow: rgba(255, 107, 53, 0.3);        /* Orange glow for focus states */
```

---

## Typography System

### 📚 **Font Stack**
```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 📏 **Font Size Scale**
```css
--font-size-xs: 12px;    /* Small labels, metadata */
--font-size-sm: 14px;    /* Secondary text, form labels */
--font-size-base: 16px;  /* Body text, default size */
--font-size-lg: 18px;    /* Emphasized text */
--font-size-xl: 20px;    /* Subheadings */
--font-size-2xl: 24px;   /* Page headings */
--font-size-3xl: 32px;   /* Hero titles, large stats */
```

### 🎯 **Font Weight Guidelines**
- **400 (Normal)**: Body text, descriptions
- **500 (Medium)**: Button text, form labels
- **600 (Semibold)**: Card titles, section headers
- **700 (Bold)**: Page titles, navigation, stats

---

## Spacing System

### 📐 **Consistent Spacing Scale**
```css
--spacing-xs: 4px;     /* Micro spacing - button padding */
--spacing-sm: 8px;     /* Small gaps - form elements */
--spacing-md: 16px;    /* Standard spacing - card padding */
--spacing-lg: 24px;    /* Large spacing - section gaps */
--spacing-xl: 32px;    /* Extra large - major sections */
--spacing-2xl: 48px;   /* Maximum spacing - page sections */
```

### 📏 **Usage Guidelines**
- **xs (4px)**: Internal button padding, icon spacing
- **sm (8px)**: Form field gaps, small element padding
- **md (16px)**: Standard card padding, navigation gaps
- **lg (24px)**: Major content sections, large card padding
- **xl (32px)**: Page-level spacing, hero sections
- **2xl (48px)**: Maximum spacing for major page divisions

---

## Border Radius System

### 🔲 **Hard Edge Aesthetic**
```css
--radius-sm: 0px;    /* All small elements */
--radius-md: 0px;    /* All medium elements */
--radius-lg: 0px;    /* All large elements */
--radius-xl: 0px;    /* All extra large elements */
```

**Important**: PracTrac uses **zero border-radius** throughout the entire application to maintain a sharp, professional, angular aesthetic that distinguishes it from softer consumer apps.

---

## Component Architecture

### 🪟 **Glass Card (Primary Container)**
```css
.glass-card {
    background: var(--glass-primary);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 0px; /* Hard edges only */
    box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### 🔘 **Glass Button (Interactive Elements)**
```css
.glass-button {
    background: var(--glass-secondary);
    backdrop-filter: blur(15px);
    border: 1px solid var(--glass-border);
    border-radius: 0px; /* Hard edges only */
    color: var(--text-primary);
    padding: var(--spacing-sm) var(--spacing-md);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-button:hover {
    background: var(--glass-tertiary);
    border-color: var(--accent-orange);
    box-shadow: 0 0 12px rgba(255, 107, 53, 0.2);
    transform: translateY(-1px);
}
```

### 📝 **Glass Input (Form Elements)**
```css
.glass-input {
    background: var(--glass-tertiary);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: 0px; /* Hard edges only */
    color: var(--text-primary);
    padding: var(--spacing-sm) var(--spacing-md);
}

.glass-input:focus {
    border-color: var(--accent-orange);
    box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
    background: var(--glass-secondary);
}
```

### 🏢 **Glass Modal (Overlays)**
```css
.glass-modal {
    background: var(--glass-primary);
    backdrop-filter: blur(25px);
    border: 1px solid var(--glass-border);
    border-radius: 0px; /* Hard edges only */
    box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

---

## Button Variations

### 🟠 **Primary Action Buttons**
```css
.glass-button.primary {
    background: linear-gradient(135deg, var(--accent-orange), #e55a2b);
    border-color: var(--accent-orange);
    font-weight: 600;
}
```

### 🎥 **Video/Media Buttons**
```css
.glass-button.glass-button-video {
    background: linear-gradient(135deg, var(--glass-secondary) 0%, rgba(255, 165, 0, 0.1) 100%);
    border-color: var(--accent-orange);
    color: var(--accent-orange);
}
```

### 🚨 **Destructive Action Buttons**
```css
.glass-button.danger {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    border-color: #ef4444;
    color: white;
    font-weight: 600;
}
```

---

## Background System

### 🌌 **App Background**
```css
body {
    background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%);
    background-attachment: fixed;
}
```

### ⚫ **Fullscreen Practice Mode**
```css
/* For immersive practice mode */
body.practice-mode {
    background: #000000; /* Pure black for focus */
}
```

---

## Animation Guidelines

### ⚡ **Transition Timing**
```css
/* Standard transitions */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Smooth interactions */
transition: all 0.3s ease;
```

### 🎭 **Hover Effects**
- **Subtle lift**: `transform: translateY(-1px);`
- **Orange glow**: `box-shadow: 0 0 12px rgba(255, 107, 53, 0.2);`
- **Border highlight**: `border-color: var(--accent-orange);`

### 📈 **Focus States**
- **Orange outline**: `box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);`
- **Background shift**: `background: var(--glass-secondary);`

---

## Layout Principles

### 📱 **Responsive Grid System**
```css
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
```

### 📐 **Flexbox Utilities**
```css
.flex-center { display: flex; justify-content: center; align-items: center; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-column { flex-direction: column; }
```

---

## Usage Guidelines

### ✅ **DO**
- Use glass effects for all major containers
- Maintain hard edges (0px border-radius) throughout
- Use orange (#FF6B35) for primary actions and focus states
- Layer transparency to create depth
- Use high contrast text colors for readability
- Apply subtle hover animations for interactivity

### ❌ **DON'T**
- Add rounded corners to any elements
- Use bright background colors that compete with glass effects
- Create low contrast text combinations
- Overuse the orange accent color
- Apply excessive animations or transitions
- Mix different design systems or aesthetic approaches

---

## Implementation Notes

### 🔧 **CSS Custom Properties**
All colors, spacing, and effects are defined as CSS custom properties (variables) for easy theming and consistency.

### 🌐 **Browser Support**
- Backdrop filter support required for glass effects
- Fallbacks provided for older browsers
- Progressive enhancement approach

### 📱 **Responsive Considerations**
- Mobile breakpoint: 768px
- Desktop optimization: 1024px+
- iPad-first design philosophy
- Touch-friendly interactive elements

### 🎯 **Accessibility**
- High contrast ratios maintained
- Focus states clearly visible
- Touch targets minimum 44px
- Screen reader compatible structure

---

## Quick Reference

### 🎨 **Most Used Colors**
- **Primary Glass**: `rgba(0, 0, 0, 0.85)`
- **Orange Accent**: `#FF6B35`
- **Primary Text**: `#FFFFFF`
- **Border**: `rgba(255, 255, 255, 0.1)`

### 📏 **Most Used Spacing**
- **Standard Gap**: `16px` (--spacing-md)
- **Button Padding**: `8px 16px` (--spacing-sm --spacing-md)
- **Card Padding**: `24px` (--spacing-lg)

### 🎯 **Key Transitions**
- **Hover**: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- **Focus**: `all 0.3s ease`
- **Transform**: `translateY(-1px)` on hover

This design system creates a cohesive, professional, and visually striking interface that enhances the coaching experience while maintaining excellent usability and accessibility.