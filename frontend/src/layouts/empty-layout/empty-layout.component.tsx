'use client';

export default function EmptyLayout({ children }) {
  return (
    <div className="EmptyLayout">
      <div className="bg-gray-lighter min-h-screen">{children}</div>
    </div>
  );
}
