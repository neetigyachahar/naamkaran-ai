interface LogoMarkProps {
  className?: string;
  /** Height in px (width follows aspect ratio). */
  size?: number;
  /** Square app-icon with brand gradient, or flat indigo mark on transparent bg. */
  variant?: "square" | "mark";
}

export function LogoMark({
  className = "",
  size = 32,
  variant = "mark",
}: LogoMarkProps) {
  if (variant === "square") {
    return (
      <img
        src="/logo-square.png"
        alt=""
        aria-hidden="true"
        className={`inline-block shrink-0 object-contain ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
        }}
      />
    );
  }

  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      className={`block shrink-0 object-contain ${className}`}
      style={{
        height: size,
        width: "auto",
      }}
    />
  );
}
