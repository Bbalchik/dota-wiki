import { fetchHeroStats } from "@/lib/opendota";
import { HeroesEncyclopediaView } from "@/components/meta/HeroesEncyclopediaView";

export const dynamic = "force-dynamic";

export default async function HeroesPage() {
  const heroes = await fetchHeroStats();

  return <HeroesEncyclopediaView heroes={heroes} />;
}
