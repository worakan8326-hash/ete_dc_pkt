# Design System Document: Precision Inventory Management

## 1. Overview & Creative North Star

### The Creative North Star: "The Clinical Architect"
This design system is built to transform the mundane nature of inventory management into a high-precision, editorial experience. We are moving away from the "standard dashboard" look characterized by heavy borders and gray boxes. Instead, we embrace **The Clinical Architect**—a philosophy that treats data with the reverence of a blueprint. 

By utilizing intentional asymmetry, deep tonal layering, and sophisticated Thai typography, we create a workspace that feels both authoritative and breathable. The goal is to provide a "High-End Editorial" feel where the information is the hero, supported by a structure that is felt rather than seen. We break the grid through varying content densities and "floating" interactive modules that prioritize clarity over containment.

---

## 2. Colors

The palette is a sophisticated interplay of deep architectural blues and "clean-room" neutrals, optimized for long-duration focus.

### Tonal Foundations
*   **Primary (#0040a8):** Our authoritative anchor. Reserved for high-level navigation and primary actions.
*   **Primary Container (#2b59c3):** The "action" blue. Used for prominent UI elements that require user focus.
*   **Surface & Background (#f8f9fc):** A cool-tinted white that reduces eye strain compared to pure #FFFFFF.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined through:
1.  **Background Color Shifts:** Placing a `surface-container-low` section against a `surface` background.
2.  **Negative Space:** Using the Spacing Scale to create "voids" that act as invisible dividers.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of stacked material. 
*   **Level 0 (Base):** `surface` (#f8f9fc)
*   **Level 1 (Sections):** `surface-container-low` (#f2f3f6)
*   **Level 2 (Cards/Interaction):** `surface-container-lowest` (#ffffff)
*   **Level 3 (Pop-overs):** `surface-bright` (#f8f9fc) with Glassmorphism.

### The "Glass & Gradient" Rule
To avoid a flat, "out-of-the-box" appearance:
*   **Floating Elements:** Use `surface-container-lowest` at 85% opacity with a `20px` backdrop-blur to create a "frosted glass" effect for tooltips and modal overlays.
*   **Signature Gradients:** For primary CTAs, use a subtle linear gradient from `primary` (#0040a8) to `primary-container` (#2b59c3) at a 135° angle.

---

## 3. Typography

The system utilizes **Prompt**, a geometric sans-serif optimized for Thai legibility. The hierarchy is designed to feel like a high-end technical manual.

*   **Display (Lg/Md/Sm):** Used for large data visualizations or dashboard summaries. Set with tight tracking (-0.02em) to feel "engineered."
*   **Headline (Lg/Md/Sm):** The main entry point for page sections. These should be bold and unapologetic.
*   **Body (Lg/Md/Sm):** High-precision reading. Ensure line height is generous (1.6x) for Thai characters to prevent "vowel stacking" from feeling cluttered.
*   **Label (Md/Sm):** All-caps or high-weight for metadata and table headers.

**Brand Identity through Type:** By pairing large, light-weight Display type with small, bold Labels, we create a rhythmic contrast that feels editorial rather than "form-based."

---

## 4. Elevation & Depth

We reject drop-shadows as a primary means of separation. Instead, we use **Tonal Layering**.

*   **The Layering Principle:** A "Product Detail" card (`surface-container-lowest`) sits atop a "Category" background (`surface-container-low`). The 2-step shift in hex value provides a soft, natural lift.
*   **Ambient Shadows:** Only used for "floating" elements like modals. 
    *   *Values:* `0px 12px 32px rgba(25, 28, 30, 0.06)`. 
    *   The shadow is tinted with the `on-surface` color to look like natural light refraction.
*   **The "Ghost Border" Fallback:** If a border is required for high-density data tables, use `outline-variant` at **15% opacity**. Never 100%.
*   **Glassmorphism:** Use backdrop blurs to allow the brand blues to bleed through floating panels, making the system feel integrated and deep.

---

## 5. Components

### Buttons
*   **Primary:** Gradient-filled (Primary to Primary-Container), `lg` (0.5rem) roundedness. No border.
*   **Secondary:** `surface-container-high` background with `primary` text.
*   **Tertiary:** Ghost style. No background, `primary` text, shifts to `surface-container-low` on hover.

### Input Fields
*   **Style:** Minimalist. Use `surface-container-highest` as the background with a bottom-only "Focus Stripe" in `primary` (2px).
*   **Thai Optimization:** Ensure the input height accounts for Thai tone marks to prevent clipping.

### Cards & Tables (The "Inventory Grid")
*   **Constraint:** Forbid divider lines between rows. 
*   **The Solution:** Use alternating row fills (Zebra striping) with `surface` and `surface-container-low`. 
*   **Asymmetry:** Align numerical data to the right using `label-md` and descriptive text to the left using `body-md` to create a visual "anchor and flow" across the screen.

### Status Chips
*   **Visual Soul:** Instead of solid blocks, use semi-transparent backgrounds (12% opacity) of the status color (e.g., `error` for out-of-stock) with a bold, 100% opacity text label inside.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use white space as a structural element. If an element feels "stuck," add `spacing-8` (1.75rem) of margin rather than a border.
*   **Do** use `Prompt` Medium or Bold for Thai headings to ensure the character loops are clearly visible.
*   **Do** use the `primary-fixed` token for subtle "selected" states in sidebars; it provides a soft blue glow without the aggression of the primary color.

### Don’t
*   **Don’t** use pure black (#000000) for text. Use `on-surface` (#191c1e) to maintain the "Architectural" softness.
*   **Don’t** use standard Material Design "Floating Action Buttons." They disrupt the editorial flow. Integrate actions into the surface-layer logic.
*   **Don’t** use sharp corners. Always use a minimum of `md` (0.375rem) roundedness to keep the professional aesthetic from feeling "harsh" or "dated."

---

## 7. Signature Pattern: The "Data-Shelf"
For the Inventory Management context, we introduce the **Data-Shelf**. Instead of a standard vertical list, items are grouped in wide, low-profile containers that "hang" from the top of their sections. This emphasizes the horizontal flow of information—Status > SKU > Quantity > Location—mimicking the way a warehouse manager scans a physical shelf.