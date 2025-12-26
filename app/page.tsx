import TemplateCard from "@/components/TemplateCard";

export default function Home() {
  const templates = [

    {
      slug: "chain",
      title: "Chain Ribbons (multi-link)",
      desc: "Final image: speed/length ratios → tip path (fixed legs=1).",
    },
    {
      slug: "spiro",
      title: "Rolling Circle Spirograph",
      desc: "Final image: rolling circle with one arm (auto close length).",
    },
{
    slug: "fourier",
    title: "Fourier Image (from contour)",
    desc: "Upload an image + choose order N → final Fourier curve.",
  },
  {
    slug: "mandelbrot",
    title: "Mandelbrot (Final Image)",
    desc: "Input x/y center → zoom in/out and export a Mandelbrot final image.",
  },
];


  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">WangBaoWei Templates</h1>
        <p className="mt-2 text-zinc-300">
          Front-end only. Render one final image and download as PNG.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard key={t.slug} {...t} />
          ))}
        </div>

        <div className="mt-8 text-sm text-zinc-400">
          Tip: Start with 1920×1080 and 8k–20k points/steps for smooth lines.
        </div>
      </div>
    </main>
  );
}
