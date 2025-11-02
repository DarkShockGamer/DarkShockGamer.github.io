# Custom Context Menu Component

A reusable, accessible, and responsive context menu component for the Trident Robotics website that replaces the default browser context menu on both desktop and mobile devices.

## Features

✅ **Context-Aware** - Shows different menu options based on what you right-click:
- Images: Open in new tab, copy address, download
- Links: Open in new tab, copy link address
- Text selection: Copy, search selection
- Default: Refresh, back, and custom options

✅ **Multi-Platform Support**
- Desktop: Right-click to open
- Mobile: Long-press (0.5s) to open with haptic feedback

✅ **Accessible**
- Keyboard navigation (Arrow keys, Enter, Escape)
- ARIA attributes for screen readers
- Focus indicators for keyboard users
- Respects prefers-reduced-motion

✅ **Styled to Match Site Theme**
- Uses site's CSS variables (--dark-blue, --medium-blue, --light-blue, --accent)
- Smooth animations and transitions
- Responsive design for all screen sizes

✅ **Easy to Use**
- Automatic initialization
- No configuration required for basic usage
- Simple API for customization

## Quick Start

Add these two lines to the `<head>` section of your HTML:

```html
<link rel="stylesheet" href="/assets/css/context-menu.css">
<script src="/assets/js/context-menu.js"></script>
```

That's it! The context menu will automatically work on your page.

## Demo

Visit [/context-menu-demo.html](/context-menu-demo.html) to see the component in action with examples for all use cases.

## Files

- **`/assets/js/context-menu.js`** - Main JavaScript component (500+ lines)
- **`/assets/css/context-menu.css`** - Component styles (250+ lines)
- **`/context-menu-demo.html`** - Interactive demo page with documentation

## Customization

### Adding Custom Menu Items

```javascript
// Wait for the component to load
window.addEventListener('load', function() {
  // Add custom item for images
  ContextMenu.config.imageMenuItems.push({
    label: 'Set as Background',
    icon: '🖼️',
    action: (target) => {
      document.body.style.backgroundImage = `url(${target.src})`;
      ContextMenu.showToast('Background updated!');
    }
  });

  // Add custom item for text selection
  ContextMenu.config.textMenuItems.push({
    label: 'Translate',
    icon: '🌐',
    action: () => {
      const text = window.getSelection().toString();
      window.open(`https://translate.google.com/?text=${encodeURIComponent(text)}`, '_blank');
    }
  });
});
```

### Configuration Options

```javascript
ContextMenu.config = {
  longPressDuration: 500,           // Mobile long-press duration (ms)
  preventDefaultContextMenu: true,  // Prevent browser's default menu
  imageMenuItems: [...],            // Menu items for images
  linkMenuItems: [...],             // Menu items for links
  textMenuItems: [...],             // Menu items for text selection
  defaultMenuItems: [...]           // Default menu items
};
```

### Menu Item Structure

```javascript
{
  label: 'Menu Item Label',  // Required: Text to display
  icon: '📋',                // Optional: Emoji or text icon
  action: (target) => {      // Required: Function to execute
    // target is the element that was right-clicked
    console.log('Action executed', target);
  }
}
```

## API Reference

### ContextMenu.config
Configuration object for customizing menu behavior and items.

### ContextMenu.showToast(message, duration)
Display a toast notification to the user.
```javascript
ContextMenu.showToast('Action completed!', 2000);
```

### ContextMenu.close()
Programmatically close the context menu.
```javascript
ContextMenu.close();
```

### ContextMenu.init()
Manually initialize the context menu (called automatically on page load).

## Keyboard Shortcuts

- **Arrow Down/Up** - Navigate menu items
- **Enter** or **Space** - Select menu item
- **Escape** - Close menu

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note:** Some features like clipboard operations require HTTPS or localhost.

## Accessibility

- ✅ ARIA roles and attributes
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Respects user preferences (reduced motion, high contrast)

## Technical Details

### Desktop Interaction
- Listens for `contextmenu` event
- Prevents default browser menu
- Shows styled menu at cursor position

### Mobile Interaction
- Listens for `touchstart`, `touchmove`, `touchend` events
- Detects long-press (500ms default)
- Provides haptic feedback via vibration API
- Prevents text selection during long-press

### Smart Positioning
- Automatically adjusts position to stay within viewport
- Prevents overflow on small screens
- Supports scrollable menus for many items

## Integration Examples

### Basic Integration
See `CONTEXT_MENU_INTEGRATION.html` for a complete example.

### Integration with Existing Site
To add to any existing page like `index.html`, `calendar.html`, etc.:

1. Add the CSS link in the `<head>` section
2. Add the JS script in the `<head>` section
3. Optionally customize menu items in a `<script>` tag

## Troubleshooting

### Menu not appearing
- Ensure both CSS and JS files are loaded
- Check browser console for errors
- Verify paths to CSS and JS files are correct

### Menu appears but closes immediately
- Check if there are conflicting event listeners
- Verify the `preventDefaultContextMenu` config is `true`

### Clipboard operations not working
- Clipboard API requires HTTPS or localhost
- Some browsers may require user permission

### Mobile long-press not working
- Ensure touch events are not being prevented by other scripts
- Check if `longPressDuration` is set appropriately (default: 500ms)
- Try increasing the duration for slower devices

## Contributing

To modify the component:

1. Edit `/assets/js/context-menu.js` for functionality
2. Edit `/assets/css/context-menu.css` for styling
3. Test changes in `/context-menu-demo.html`
4. Update this README if adding new features

## License

This component is part of the Trident Robotics website. 
Use within the project as needed.

---

**Questions?** See the demo page or contact the development team.
