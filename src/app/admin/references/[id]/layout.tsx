export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ReferenceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}