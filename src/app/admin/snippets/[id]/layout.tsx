export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function SnippetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}