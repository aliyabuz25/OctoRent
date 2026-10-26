import React from 'react';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';

export default function BIcon({ name, slot, size = 18, color, className = '', style = {}, ...props }) {
  return (
    <span
      slot={slot}
      className={`bicon-wrap ${className}`.trim()}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      <FeatherIcon name={name} size={size} color={color} {...props} />
    </span>
  );
}
