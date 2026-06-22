export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function FiresideEditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}