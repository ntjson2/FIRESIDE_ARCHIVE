export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function SnippetPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}