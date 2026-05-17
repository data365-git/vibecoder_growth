---
name: Systematic Precision
colors:
  surface: '#f9f9fa'
  surface-dim: '#dadadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeef'
  surface-container-high: '#e8e8e9'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1d'
  on-surface-variant: '#424656'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737687'
  outline-variant: '#c3c6d8'
  surface-tint: '#0052dd'
  primary: '#004ccd'
  on-primary: '#ffffff'
  primary-container: '#0f62fe'
  on-primary-container: '#f3f3ff'
  inverse-primary: '#b4c5ff'
  secondary: '#5e5d66'
  on-secondary: '#ffffff'
  secondary-container: '#e1dee9'
  on-secondary-container: '#62626a'
  tertiary: '#9e3100'
  on-tertiary: '#ffffff'
  tertiary-container: '#c84000'
  on-tertiary-container: '#fff1ed'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174c'
  on-primary-fixed-variant: '#003da9'
  secondary-fixed: '#e4e1eb'
  secondary-fixed-dim: '#c7c5cf'
  on-secondary-fixed: '#1b1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#f9f9fa'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e3'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for high-density information management and professional task execution. It prioritizes clarity, systematic organization, and a "low-friction" user experience to support complex decision-making.

The visual style is **Corporate / Modern**. It leverages a utilitarian aesthetic that values function over flourish. The interface feels dependable and structured, using subtle depth and a restrained color palette to ensure that data remains the focal point. Whitespace is used intentionally to separate workstreams without sacrificing the data density required for dashboard environments.

## Colors

This design system utilizes a palette rooted in professional blues and functional grays. 

- **Primary:** A deep, active blue used for primary actions and focused states.
- **Neutrals:** A comprehensive scale of cool grays. Backgrounds use off-whites to reduce eye strain, while borders use light grays to define structure.
- **Semantic Colors:** Critical for status communication. Greens, ambers, and reds are used exclusively for status indicators, progress bars, and alerts to provide immediate visual feedback on project health.

## Typography

The typography is built entirely on **Inter** to maximize legibility across varying pixel densities. 

The system uses a strict hierarchy: 
- **Headlines** use semi-bold weights with slight negative letter-spacing for a compact, professional look.
- **Body text** defaults to 14px for standard dashboard views, striking a balance between readability and data density.
- **Labels** are utilized for metadata, tags, and table headers, often employing a medium weight or uppercase styling to differentiate from interactive body text.

## Layout & Spacing

The design system employs a **Fluid Grid** model with fixed outer margins. 

- **Grid:** A 12-column system for desktop and a 4-column system for mobile. 
- **Rhythm:** An 8pt spatial system governs all padding and margins to ensure mathematical consistency.
- **Adaptation:** On mobile, side-by-side dashboard cards stack vertically, and horizontal padding is reduced to 16px to maximize the narrow viewport.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines**. 

- **Surfaces:** The main background is the lowest layer (F4F4F5). Dashboard cards and containers are "raised" using a pure white background (#FFFFFF).
- **Outlines:** Instead of heavy shadows, components use 1px borders (#E0E0E0) to define boundaries. 
- **Shadows:** Only used for transient elements like dropdown menus or modals. These are soft, ambient shadows with 4-8% opacity and no color tinting.

## Shapes

The shape language is **Soft** and restrained. 

- **Radius:** A base radius of 4px is applied to buttons, input fields, and checkboxes to maintain a disciplined, professional appearance. 
- **Containers:** Larger cards and modals use an 8px radius (`rounded-lg`) to subtly distinguish them from smaller UI components.
- **Interactive elements:** Checkboxes maintain a slight radius to feel modern but precise.

## Components

### Buttons & Inputs
Buttons feature flat color fills for primary actions and 1px strokes for secondary actions. Input fields use a subtle gray background that shifts to a white background with a 2px blue border on focus.

### Status Badges & Progress Bars
- **Badges:** Use a "Light Fill" style—a desaturated background color with a high-contrast text color (e.g., light green background with dark green text).
- **Progress Bars:** Represented by a 4px tall track. The container is a light neutral gray, and the progress fill uses semantic colors (Primary, Success, Warning) depending on the context.

### Interactive Checkmarks
Checkboxes use a solid primary blue fill when active, with a white vector checkmark. The transition should be an instant, snappy scale effect to provide tactile confirmation.

### Cards
Cards are the primary container for data modules. They include a defined header area with 16px padding and a bottom border to separate the title from the content body.