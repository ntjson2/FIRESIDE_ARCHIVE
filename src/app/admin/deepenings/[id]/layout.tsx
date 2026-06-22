export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function DeepeningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}