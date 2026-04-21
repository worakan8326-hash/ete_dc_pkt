# Design System Documentation: The Precision Curator

## 1. Overview & Creative North Star

**Creative North Star: "The Digital Curator"**
Inventory management is often relegated to cluttered, utilitarian grids. This design system rejects that premise. Our goal is "The Digital Curator"—a philosophy that treats data assets with the same reverence as gallery artifacts. We move beyond the "standard dashboard" by utilizing expansive breathing room, intentional tonal layering, and high-end editorial typography.

The system breaks the traditional template look through **Atmospheric Density**. Instead of using harsh lines to contain data, we use subtle shifts in surface color and elevation. This creates an interface that feels less like a software tool and more like a premium, custom-tailored workstation where clarity and authority coexist.

---

### 2. Colors & Surface Architecture

The palette is anchored by a commanding "Trust Blue" and supported by a sophisticated hierarchy of grayscale neutrals.

#### Primary & Brand Tones
- **Primary (`#0040a8`):** Use for high-emphasis actions and brand identity.
- **Primary Container (`#2b59c3`):** The core interactive blue used for primary buttons and active states.
- **Surface Tint (`#2958c2`):** Used for glassmorphism overlays to maintain brand cohesion in blurs.

#### Semantic Status (Badges)
- **Success (Green):** `tertiary` (`#005338`) text on `tertiary_fixed` (`#6ffbbe`) background.
- **Warning (Yellow):** Use `secondary_fixed_dim` variations with warm saturation for inventory "Low Stock" alerts.
- **Critical (Red):** `error` (`#ba1a1a`) text on `error_container` (`#ffdad6`) background.

#### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through:
1.  **Background Color Shifts:** Placing a `surface_container_lowest` card on a `surface_container` background.
2.  **Tonal Transitions:** Using the `surface` tokens to create natural separation.

#### Glass & Texture
- **The Navigation Bar:** Should utilize a `primary_container` base with a subtle linear gradient transitioning into `primary` to provide "soul" and depth.
- **Floating Elements:** Modals and dropdowns should use a backdrop-blur (12px-20px) combined with a semi-transparent `surface_container_lowest` (85% opacity) to create a "frosted glass" effect.

---

### 3. Typography

The typography system is built on **Inter**, optimized for legibility and a modern, authoritative tone.

| Role | Token | Size | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | 3.5rem | 700 | Large data hero numbers |
| **Headline** | `headline-sm` | 1.5rem | 600 | Page titles (e.g., "Current Inventory") |
| **Title** | `title-md` | 1.125rem | 500 | Section headers within cards |
| **Body** | `body-md` | 0.875rem | 400 | Table data and descriptions |
| **Label** | `label-md` | 0.75rem | 600 | Badge text, column headers (Uppercase) |

**Editorial Note:** Use `on_surface_variant` for column headers to create a visual hierarchy that allows the primary data (in `on_surface`) to pop.

---

### 4. Elevation & Depth

We convey importance through **Tonal Layering** rather than structural lines.

- **The Layering Principle:** Stack surfaces to create depth.
    - Level 0: `surface` (Canvas)
    - Level 1: `surface_container_low` (Sidebar/Background areas)
    - Level 2: `surface_container_lowest` (Main Content Cards)
- **Ambient Shadows:** For floating elements (like the navigation user profile or dropdowns), use a shadow color tinted with the `primary` hue at 5% opacity. Blur should be a minimum of `24px` to mimic natural light.
- **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline_variant` at **15% opacity**. This provides a hint of structure without breaking the seamless "Digital Curator" aesthetic.

---

### 5. Components

#### Navigation Bar
- **Style:** Deep `primary_container` (#2b59c3).
- **Items:** Use `on_primary` for text. The active state is indicated by a `surface_container_lowest` indicator bar at the bottom or a subtle "glow" behind the icon.

#### Data Tables (The "Curated List")
- **Header:** Background `surface_container_high`. No vertical dividers.
- **Rows:** Alternating rows are forbidden. Use white space (`spacing-4`) to separate entries. On hover, a row should shift to `surface_container_low`.
- **Badges:** Use `roundedness-full` for a pill shape. Padding: `0.5rem` (sides), `0.125rem` (top/bottom).

#### Inputs & Search
- **Shape:** `roundedness-md`.
- **Border:** Use the "Ghost Border" rule. On focus, the border transitions to a 2px `primary` stroke with a soft `surface_tint` outer glow.

#### Buttons
- **Primary:** `primary_container` background with `on_primary` text. `roundedness-sm`.
- **Secondary:** Transparent background with a `primary` "Ghost Border."
- **Ghost:** No background or border; uses `primary` text for low-priority actions.

---

### 6. Do's and Don'ts

#### Do
- **DO** use generous padding (`spacing-6` and above) around data tables to create a "gallery" feel.
- **DO** use `surface_container_lowest` for the main dashboard white space to ensure it feels brighter and more "active" than the background.
- **DO** align all text to a strict baseline to maintain the editorial structure.

#### Don't
- **DON'T** use 100% black text. Use `on_surface` (#191c1d) to keep the contrast high but the feel "premium."
- **DON'T** use high-contrast dividers between table rows. Use a `px` height gap or a `surface_variant` line at 10% opacity if absolutely necessary.
- **DON'T** use default "Blue" for links. Always use the specified `primary` or `primary_container` tokens to maintain the specific brand signature.