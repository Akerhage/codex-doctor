# UI Guidelines

## Direction
A calm, premium Windows diagnostic workspace inspired by the user's current Atlas screenshots. Dark navy and slate surfaces, restrained teal accents, rounded cards, clear typography and compact status pills. Do not copy Atlas source or claim exact design tokens have been extracted.

## Layout
Desktop sidebar, top bar and responsive content area. Dashboard prioritizes current observations, evidence and recent events. Diagnostics exposes provenance and errors. Recovery clearly separates available actions from future functionality. Settings exposes only implemented preferences.

## Tokens
Use CSS custom properties for surfaces, text, borders, accents, spacing and radii. Establish actual values during implementation and test contrast. Avoid decorative glow that reduces readability. Support reduced motion and keyboard focus.

## Status language
Use Healthy, Warning, Failed, Unknown, Unavailable and Mock only when supported by the data contract. Unknown must not be green. Mock values must remain visibly labeled throughout the UI. Do not use an arbitrary health percentage.

## Components
Start with reusable Button, Card, Badge, StatusIndicator, Sidebar, Header, ObservationCard and Timeline. Add components when repetition or responsibility justifies them. Do not create a separate UI package or introduce a state-management framework in Sprint 1.

## Accessibility
Semantic buttons and navigation, visible focus, accessible names, sufficient contrast, keyboard operation and reduced-motion support. Avoid color-only status communication.

## Responsive behavior
At narrow widths, navigation and cards reflow without horizontal page overflow. Dense technical data may use a clearly bounded local scroller where necessary.

## Empty and error states
Explain what is unavailable and why. Never display invented measurements to fill empty space. Distinguish a failed diagnostic from a diagnostic that has not run.