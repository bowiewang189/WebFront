import Link from "next/link";

export default function TemplateCard({
  slug,
  title,
  desc,
}: {
  slug: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={`/templates/${slug}`}
      className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/70"
    >
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-800 flex items-center justify-center">
        <div className="text-zinc-300 text-sm">Preview</div>
      </div>
      <div className="mt-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-sm text-zinc-300">{desc}</div>
      </div>
    </Link>
  );
}
