export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function FamilyEditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}