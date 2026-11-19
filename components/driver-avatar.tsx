import { UserRound } from "lucide-react";

const columns = 6;
const rows = 3;

export function DriverAvatar({ driverId }: { driverId: string }) {
  const index = Number(/^DRV-(\d{3})$/.exec(driverId)?.[1]) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= columns * rows) {
    return <span className="driver-avatar driver-avatar-fallback" aria-hidden="true"><UserRound size={16} /></span>;
  }
  const column = index % columns;
  const row = Math.floor(index / columns);
  return <span className="driver-avatar" aria-hidden="true" style={{
    backgroundImage: "url(/driver-portraits.webp)",
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${column / (columns - 1) * 100}% ${row / (rows - 1) * 100}%`,
  }} />;
}
