const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-lg",
} as const;

// The app's logo mark, wherever it appears: an uploaded Organisation logo
// image if one is set, otherwise the "SE" initials badge coloured with the
// configured brand Primary Colour (via the --brand-primary CSS custom
// property set on <html> in the root layout — see Organisation Settings).
export default function BrandMark({
  logoUrl,
  size = "md",
}: {
  logoUrl: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external Supabase storage URL, not a static local asset
    return <img src={logoUrl} alt="" className={`${SIZE_CLASSES[size]} shrink-0 rounded-lg object-contain`} />;
  }

  return (
    <div
      className={`flex ${SIZE_CLASSES[size]} shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)] font-bold text-white`}
    >
      SE
    </div>
  );
}
