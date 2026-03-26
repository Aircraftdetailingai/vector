'use client';

import PhoneInputLib from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function PhoneInput({ value, onChange, placeholder = 'Phone number', className = '', ...props }) {
  return (
    <PhoneInputLib
      international
      defaultCountry="US"
      value={value || ''}
      onChange={(val) => onChange(val || '')}
      placeholder={placeholder}
      className={`phone-input-wrapper ${className}`}
      {...props}
    />
  );
}
