import MatchPage from "../page";

export const dynamic = "force-dynamic";

interface MatchFocusPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ heroId?: string; tab?: string }>;
}

export default async function MatchFocusPage({ params, searchParams }: MatchFocusPageProps) {
  const p = await params;
  const sp = searchParams ? await searchParams : {};
  return (
    <MatchPage
      params={Promise.resolve(p)}
      searchParams={Promise.resolve({ ...sp, tab: sp.tab ?? "focus" })}
    />
  );
}
