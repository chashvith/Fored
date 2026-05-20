import ReaderWrapper from "./ReaderWrapper";

export default async function BookReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <ReaderWrapper slug={slug} />
    </main>
  );
}