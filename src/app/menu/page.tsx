import type { Metadata } from "next";
import { getMenu } from "@/lib/data";

export const metadata: Metadata = {
  title: "Menu",
};

export default async function MenuPage() {
  const menu = await getMenu();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center font-display text-5xl">Menu</h1>
      <p className="mt-4 text-center text-charcoal/60">
        Made from scratch daily. Menu changes with the seasons.
      </p>

      {menu.map((category) => (
        <section key={category.id} className="mt-16">
          <div className="border-b border-charcoal/15 pb-3">
            <h2 className="font-display text-3xl">{category.name}</h2>
            {category.description && (
              <p className="mt-1 text-sm text-charcoal/60">
                {category.description}
              </p>
            )}
          </div>
          <ul className="mt-6 space-y-6">
            {category.items.map((item) => (
              <li key={item.id} className="flex items-baseline gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.dietary_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-sage/15 px-2 py-0.5 text-xs text-sage"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-charcoal/65">
                    {item.description}
                  </p>
                </div>
                <span className="font-medium text-ember">${item.price}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
