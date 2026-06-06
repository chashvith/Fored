import UploadForm from "../../components/upload-form";

export const metadata = { title: "Upload Document" };

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload a PDF or EPUB</h1>
      <UploadForm />
    </main>
  );
}
