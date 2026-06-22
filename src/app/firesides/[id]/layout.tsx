export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function FiresideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}