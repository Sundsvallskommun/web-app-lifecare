'use client';

export default function EmptyLayout({ children }) {
  return (
    <div className="EmptyLayout">
      <div className="bg-background-200 min-h-screen">{children}</div>
    </div>
  );
}
