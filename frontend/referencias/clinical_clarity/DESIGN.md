---
name: Clinical Clarity
colors:
  surface: '#f6faff'
  surface-dim: '#d2dbe4'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf5fe'
  surface-container: '#e6eff8'
  surface-container-high: '#e0e9f2'
  surface-container-highest: '#dbe4ed'
  on-surface: '#141d23'
  on-surface-variant: '#424752'
  inverse-surface: '#293138'
  inverse-on-surface: '#e9f2fb'
  outline: '#727784'
  outline-variant: '#c2c6d4'
  surface-tint: '#115cb9'
  primary: '#003f87'
  on-primary: '#ffffff'
  primary-container: '#0056b3'
  on-primary-container: '#bbd0ff'
  inverse-primary: '#acc7ff'
  secondary: '#555f6c'
  on-secondary: '#ffffff'
  secondary-container: '#d9e3f2'
  on-secondary-container: '#5b6572'
  tertiary: '#004c17'
  on-tertiary: '#ffffff'
  tertiary-container: '#006722'
  on-tertiary-container: '#6fe87c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004491'
  secondary-fixed: '#d9e3f2'
  secondary-fixed-dim: '#bdc7d6'
  on-secondary-fixed: '#131c27'
  on-secondary-fixed-variant: '#3e4853'
  tertiary-fixed: '#83fc8e'
  tertiary-fixed-dim: '#66df75'
  on-tertiary-fixed: '#002106'
  on-tertiary-fixed-variant: '#00531a'
  background: '#f6faff'
  on-background: '#141d23'
  surface-variant: '#dbe4ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
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
    fontSize: 18px
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
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

The brand personality is authoritative yet empathetic, designed to instill confidence and reduce patient anxiety. The target audience spans from young tech-savvy individuals to elderly patients, requiring a high degree of accessibility and clarity.

The design style follows a **Corporate / Modern** aesthetic with subtle **Minimalist** influences. It prioritizes information density and legibility over decorative elements. The visual language uses soft transitions and a systematic approach to hierarchy to create an environment that feels efficient, calm, and clinically precise. Whitespace is used strategically to prevent cognitive overload during the appointment booking or health record review process.

## Colors

This design system utilizes a palette rooted in "Medical Blue" to signify trust and stability.

- **Primary Blue (#0056B3):** Used for primary actions, active navigation states, and brand headers. It must maintain a 4.5:1 contrast ratio against white for accessibility.
- **Secondary Soft Blue (#E6F0FF):** Acts as a background for cards, highlighted list items, and "tint" layers. It provides a softer alternative to pure white.
- **Success Green (#28A745):** Specifically reserved for positive health outcomes, confirmed appointments, and "Available" status indicators.
- **Neutrals:** A range of Slate and Cool Greys are used for secondary text and borders to maintain a clean, clinical feel without the harshness of pure black.

## Typography

The design system employs **Inter** for its exceptional legibility and modern, systematic appearance. It scales gracefully from large headlines to small tabular data.

- **Headlines:** Use Bold or Semi-Bold weights to create clear section breaks. 
- **Body Text:** Standardized at 16px for primary reading to ensure high accessibility for patients with varying visual acuity. 
- **Labels:** Small, all-caps labels are used sparingly for metadata like timestamps or category tags.
- **Mobile Considerations:** On mobile screens, `display-lg` should be avoided in favor of `headline-lg` to ensure text does not wrap awkwardly in narrow viewports.

## Layout & Spacing

The design system uses a **4px baseline grid** to ensure a consistent rhythm across all components. 

For the mobile application, a fluid 4-column grid is used with 16px gutters and 20px outer margins. This ensures content remains centered and readable on various device widths. Elements should align to the grid, but vertical stack spacing should rely on the `md (16px)` unit as the default gap between related items and `lg (24px)` between unrelated sections.

## Elevation & Depth

To maintain a clean and professional look, this design system uses **Tonal Layers** combined with **Ambient Shadows**.

- **Level 0 (Base):** Background color (#F8FAFC).
- **Level 1 (Cards/Surface):** White surfaces with a very soft, diffused shadow (Blur: 8px, Y: 2px, Opacity: 4% Black). Used for secondary information.
- **Level 2 (Interactive):** White surfaces with a more pronounced shadow (Blur: 12px, Y: 4px, Opacity: 8% Blue-Tinted) to indicate tap-ability or "active" states.
- **Level 3 (Modals/Overlays):** Highest elevation with a 16px blur shadow to separate critical actions from the background content.

## Shapes

The shape language is "Rounded" to evoke a sense of approachability and care, which is vital in a medical context. 

- **Containers & Cards:** 1rem (16px) corner radius.
- **Buttons & Inputs:** 0.5rem (8px) corner radius to provide a stable, sturdy feel.
- **Small Elements (Chips/Badges):** Fully rounded (Pill-shaped) to distinguish them from larger interactive blocks.

## Components

### Buttons
- **Primary:** Solid Medical Blue fill with White text. Used for "Book Appointment" or "Confirm."
- **Secondary:** Secondary Soft Blue fill with Primary Blue text. Used for "Cancel" or "Go Back."
- **Outline:** Transparent fill with a 1px Grey border. Used for tertiary actions.

### Input Fields
- Inputs feature a light grey border (1px) that turns Medical Blue on focus. 
- Error states must use a dedicated Error Red with accompanying assistive text for accessibility.

### Cards
- Health cards (e.g., upcoming appointments) use a white background, 16px padding, and a subtle shadow. 
- Use left-aligned accent bars in Primary Blue to indicate high-priority cards.

### Chips & Status Indicators
- Status indicators for "Completed" or "Pending" use pill shapes with light-colored backgrounds and darkened text of the same hue (e.g., Success Green background at 10% opacity with 100% opacity text).

### Iconography
- Icons should be linear, 24px default size, with rounded caps and joins to match the overall shape language. Use blue tints for icons within list items to aid recognition of medical specialties (e.g., a heart for Cardiology).