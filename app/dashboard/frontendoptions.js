// Shared frontend picker options -- used by both the landing page Quickstart
// (DevPanel.js) and the dashboard's Code Samples tab (page.js). Single
// source of truth so the two never drift: HTML/CSS is the web frontend;
// Android and iOS don't render a web page at all, so they get their own
// real UI-definition file instead (XML layout / Storyboard XML), not an
// HTML/CSS file pretending to be one.

export const FRONTEND_OPTIONS = [
  {
    id: 'html', label: 'HTML & CSS', filename: 'intelligence.html', iconKey: 'html',
    hint: 'The web frontend — HTML and CSS together in one file. Works with any of the 12 backend languages below.',
  },
  {
    id: 'android', label: 'Android (XML)', filename: 'activity_main.xml', iconKey: 'android',
    hint: 'Android\'s own real UI-definition file — what the Java/Kotlin backend tabs\' MainActivity actually loads. Pair with either of those two.',
  },
  {
    id: 'ios', label: 'iOS (Storyboard)', filename: 'Main.storyboard', iconKey: 'swift',
    hint: 'iOS\'s classic UIKit UI-definition file — an XML-based alternative to the SwiftUI approach shown in the Swift backend tab. Either is valid; use whichever your project already uses.',
  },
];
