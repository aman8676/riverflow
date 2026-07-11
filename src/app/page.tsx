import HeroSection from "@/app/components/HeroSection";
import LatestQuestions from "@/app/components/LatestQuestion";
import TopContributers from "@/app/components/TopContributers";

export default function HomePage() {
  return (
    <div className="relative z-10">
      <HeroSection />

      <div className="container mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-12" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Community Activity</span>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Latest Questions</h2>
            </div>
            <div className="rounded-2xl border border-border bg-card/20 p-1 backdrop-blur-sm">
              <LatestQuestions />
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-28">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500">Leaderboard</span>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Top Contributors</h2>
            </div>
            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-md shadow-2xl">
              <TopContributers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
