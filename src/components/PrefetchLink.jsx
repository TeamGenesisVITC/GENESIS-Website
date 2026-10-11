import React from 'react';
import { Link } from 'react-router-dom';
import { prefetchRoute } from '../pages/routeLoaders';

/**
 * react-router <Link> that starts downloading the target route's chunk as soon as
 * the user shows intent (pointer hover, keyboard focus, or touch start).
 */
const PrefetchLink = React.forwardRef(function PrefetchLink(
  { to, onMouseEnter, onFocus, onTouchStart, ...rest },
  ref
) {
  const warm = () => prefetchRoute(typeof to === 'string' ? to : to?.pathname);

  return (
    <Link
      ref={ref}
      to={to}
      onMouseEnter={(e) => {
        warm();
        if (onMouseEnter) onMouseEnter(e);
      }}
      onFocus={(e) => {
        warm();
        if (onFocus) onFocus(e);
      }}
      onTouchStart={(e) => {
        warm();
        if (onTouchStart) onTouchStart(e);
      }}
      {...rest}
    />
  );
});

export default PrefetchLink;
