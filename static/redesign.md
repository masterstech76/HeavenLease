## Mobile-Responsive Webpage Development Prompt

Build the webpage using a **mobile-first, fully responsive design approach**. The page must provide a smooth and consistent experience across mobile phones, tablets, laptops, desktops, and large screens.

### 1. Responsive Layout

* Use responsive CSS with Flexbox and CSS Grid.
* Do not use fixed widths that cause horizontal scrolling.
* Use `max-width`, `%`, `rem`, `clamp()`, `min()`, and `max()` where appropriate.
* The main content should automatically adapt to the available screen width.
* Ensure there is **no horizontal overflow** at any screen size.

### 2. Breakpoints

Design and test at minimum these viewport sizes:

* 320px — small mobile
* 375px — standard mobile
* 390px — modern mobile
* 430px — large mobile
* 768px — tablet
* 1024px — small desktop/tablet landscape
* 1280px — desktop
* 1440px+ — large desktop

Do not design only for one mobile width. The layout should fluidly adapt between breakpoints.

### 3. Mobile Navigation

On mobile:

* Convert the desktop navigation into a hamburger menu.
* Make the menu easy to open and close.
* Use sufficiently large touch targets.
* Prevent the menu from going outside the viewport.
* Keep the logo properly aligned.
* Ensure navigation links are easy to tap with one hand.

On desktop:

* Display the full navigation normally.

### 4. Typography

Make typography responsive.

Use techniques such as:

```css
font-size: clamp(2rem, 6vw, 4.5rem);
```

Ensure:

* Headings never overflow.
* Paragraph text remains readable.
* Line height is comfortable on mobile.
* Buttons and navigation text remain readable.
* Avoid unnecessarily tiny text.

### 5. Images and Media

All images must be responsive.

Use:

```css
img {
    max-width: 100%;
    height: auto;
    display: block;
}
```

For hero images/cards:

* Use `object-fit: cover` where appropriate.
* Prevent images from stretching.
* Make sure images do not create horizontal scrolling.
* Optimize image sizes for mobile performance.

### 6. Cards and Sections

Desktop multi-column layouts should automatically become smaller grids or single-column layouts on mobile.

Example:

```css
.cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
}

@media (max-width: 900px) {
    .cards {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .cards {
        grid-template-columns: 1fr;
    }
}
```

Cards should:

* Fit within the viewport.
* Have consistent spacing.
* Avoid excessive padding on small screens.
* Maintain readable content hierarchy.

### 7. Forms and Inputs

Forms must be mobile friendly.

* Inputs should be at least approximately 44px high.
* Inputs should be full-width on mobile where appropriate.
* Buttons should be large enough to tap comfortably.
* Labels and error messages must remain readable.
* Do not place too many form fields side-by-side on mobile.

### 8. Buttons

Buttons must be touch-friendly.

Use:

* Minimum comfortable touch area around 44px.
* Adequate spacing between adjacent buttons.
* Full-width buttons on small mobile screens when appropriate.
* Never allow button text to overflow.

Example:

```css
@media (max-width: 600px) {
    .actions {
        flex-direction: column;
    }

    .actions .btn {
        width: 100%;
        justify-content: center;
    }
}
```

### 9. Spacing

Reduce excessive desktop spacing on mobile.

For example:

```css
.section {
    padding: 80px 0;
}

@media (max-width: 600px) {
    .section {
        padding: 50px 0;
    }
}
```

Keep consistent:

* Section spacing
* Card spacing
* Heading margins
* Button spacing
* Container padding

### 10. Hero Section

The hero must work particularly well on mobile.

On desktop:

* Use a two-column layout where appropriate.

On mobile:

* Stack content vertically.
* Keep the primary CTA visible without excessive scrolling.
* Resize the heading.
* Ensure the hero does not become excessively tall.
* Keep important information above the fold where practical.

### 11. Interactive Elements

All interactive functionality must work on touch devices.

Check:

* Hamburger menu
* Dropdowns
* Modals
* Sliders
* Forms
* Tabs
* Accordions
* Buttons
* Navigation
* Back-to-top controls

Do not rely only on hover interactions because mobile devices do not have hover.

### 12. Performance

Optimize the mobile experience.

* Minimize unnecessary JavaScript.
* Avoid heavy animations.
* Lazy-load below-the-fold images.
* Optimize images.
* Avoid unnecessary external libraries.
* Keep page load fast on slower mobile connections.

### 13. Accessibility

Follow basic accessibility practices:

* Use semantic HTML.
* Add appropriate `aria-label` attributes where necessary.
* Ensure keyboard navigation works.
* Maintain sufficient color contrast.
* Use visible focus states.
* Make touch targets sufficiently large.
* Do not communicate important information through color alone.

### 14. No Horizontal Scrolling

This is mandatory.

Test the page using:

```css
html,
body {
    max-width: 100%;
    overflow-x: hidden;
}
```

However, do not use `overflow-x: hidden` as a substitute for fixing layout problems. Identify and fix elements that actually exceed the viewport.

### 15. Mobile Testing Checklist

Before delivering the page, test it at:

**Mobile**

* 320 × 568
* 375 × 667
* 390 × 844
* 430 × 932

**Tablet**

* 768 × 1024

**Desktop**

* 1024 × 768
* 1280 × 800
* 1440 × 900

Verify:

* No horizontal scrolling
* No overlapping elements
* No clipped text
* Navigation works
* Buttons work
* Forms work
* Images scale correctly
* Cards stack correctly
* Modals fit the screen
* Footer is responsive
* Typography remains readable
* Touch targets are comfortable

### Final Requirement

Do not simply make the desktop page smaller.

**Re-design the layout responsively for mobile.**

The final result should feel like a professionally designed mobile website, not a desktop website squeezed into a phone screen.

Keep the existing branding, content, functionality, colors, and visual identity unless a change is necessary to improve responsiveness or usability.


## FAQ page incomplete 


