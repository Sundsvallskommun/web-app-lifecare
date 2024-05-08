import { Input } from '@sk-web-gui/react';
import React, { useEffect, useRef } from 'react';

const ValidatedInput = ({ value, error, onChange, type = 'text', ...otherProps }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (error && inputRef.current) {
      inputRef.current.focus();
    }
  }, [error]);

  const errorId = error ? `${otherProps.id}-error` : null;

  return (
    <div className="w-4/6 flex flex-col">
      {otherProps.label && <label htmlFor={otherProps.id}>{otherProps.label}</label>}

      <Input
        id={otherProps.id}
        className="h-14 text-base"
        type={type}
        value={value}
        onChange={onChange}
        ref={inputRef}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...otherProps}
      />
      {error && (
        <span id={errorId} className="text-red-600 mt-1 text-xs">
          {error}
        </span>
      )}
    </div>
  );
};

export default ValidatedInput;
