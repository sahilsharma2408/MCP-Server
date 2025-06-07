# Button Component Documentation for Naos design system

## Introduction

The Button component is a versatile UI element that supports multiple variants, sizes, icons, and states.

### Key Features

1. **Multiple Variants**: Button supports the following variants:

   - `primary`
   - `secondary`
   - `tertiary`
   - `destructive`
   - `destructive-secondary`
   - `destructive-tertiary`
   - `upgrade`
   - `upgrade-secondary`
   - `upgrade-tertiary`

2. **Label**: Use the `label` prop to set the button text.

3. **Sizing**: Supports default (medium) and `small` sizes via the `size` prop.

4. **Icons**:

   - `icon` prop adds an icon on the left side
   - `endIcon` prop adds an icon on the right side (only when `iconAlone` is false and `showArrowIcon` is false)
   - Both icons can be used simultaneously

5. **Icon-Only Mode**: Use `iconAlone` prop with the `icon` prop to display only the icon without text.

6. **States**:

   - `disabled` - Disables the button
   - `loading` - Shows loading state

7. **Layout**:

   - `fullWidth` - Makes button take full available width
   - `isFloatingComp` - Use when button is a trigger in floating components (SelectMenu, Dropdown, ActionList)

8. **Testing**: `dataTestId` prop available for adding test identifiers.

9. **Popover Support**:
   - `hasPopover` - Enables popover functionality (works only with `iconAlone` variant on hover)
   - `popoverData` - Contains popover configuration data

## React Usage Example

```javascript
import { Button } from '@dtsl/react';
import PlusCircle from '@dtsl/icons/dist/icons/react/PlusCircle';
import SvgAlertTriangle from '@dtsl/icons/dist/icons/react/AlertTriangle';

function ButtonImplementation() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {/* Basic Button */}
      <Button variant="secondary" label="Button" />

      {/* Small Button */}
      <Button variant="secondary" label="Button" size="small" />

      {/* With Icon */}
      <Button
        variant="secondary"
        label="Button"
        icon={<PlusCircle />}
        iconAlone={false}
      />

      {/* With End Icon */}
      <Button
        variant="secondary"
        label="Button"
        endIcon={<PlusCircle />}
        iconAlone={false}
      />

      {/* With Both Icons */}
      <Button
        variant="secondary"
        label="Button"
        endIcon={<PlusCircle />}
        icon={<PlusCircle />}
      />

      {/* Icon Alone */}
      <Button
        icon={<SvgAlertTriangle />}
        ariaLabel="SvgAlertTriangle"
        iconAlone
        label="Button"
      />

      {/* Loading Button */}
      <Button icon={<SvgAlertTriangle />} loading label="Button" />

      {/* Full Width Button */}
      <Button icon={<SvgAlertTriangle />} fullWidth label="Button" />

      {/* Button with Popover */}
      <Button
        icon={<SvgAlertTriangle />}
        iconAlone
        hasPopover
        popoverData={{
          content: <>Popover data</>,
        }}
      />
    </div>
  );
}

export default ButtonImplementation;
```
