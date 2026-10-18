export default function StorefrontTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="animate-fade-up">{children}</div>;
}
