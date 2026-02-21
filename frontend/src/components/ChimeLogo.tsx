interface Props {
  size?: number;
  className?: string;
}

const ChimeLogo = ({ size = 24, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Card body */}
    <rect x="4" y="10" width="56" height="44" rx="7" stroke="currentColor" strokeWidth="3" className="text-primary" fill="currentColor" fillOpacity="0.12" />
    {/* Magnetic strip */}
    <rect x="4" y="20" width="56" height="5" fill="currentColor" className="text-primary" opacity="0.18" />
    {/* Chip */}
    <rect x="11" y="30" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-primary" opacity="0.4" fill="none" />
  </svg>
);

export default ChimeLogo;
