import React, { useEffect, useRef } from 'react';

const ValidatedInput = ({ value, error, onChange, type = 'text', ...otherProps }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (error) {
      inputRef.current.focus();
    }
  }, [error]);

  const errorId = error ? `${otherProps.id}-error` : null;

  return (
    <div className="w-4/6 flex flex-col">
      <input
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
        <span id={errorId} className="text-red-500 mt-1 text-xs">
          {error}
        </span>
      )}
    </div>
  );
};

export default ValidatedInput;
