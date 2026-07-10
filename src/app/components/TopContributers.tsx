import { cn } from "@/lib/utils";

import { AnimatedList } from "@/components/magicui/animated-list";
import { users } from "@/models/server/config";
import { Models, Query } from "node-appwrite";
import { UserPrefs } from "@/store/auth";
import relativeTime from "@/utils/relativeTime";

function getInitialsUrl(name: string, width = 40, height = 40): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  return `${endpoint}/avatars/initials?name=${encodeURIComponent(name)}&width=${width}&height=${height}&project=${projectId}`;
}

const Notification = ({ user }: { user: Models.User<UserPrefs> }) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] transform cursor-pointer overflow-hidden rounded-2xl p-4",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-card [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu backdrop-blur-md [border:1px_solid_var(--border)] [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <picture>
          <img
            src={getInitialsUrl(user.name, 40, 40)}
            alt={user.name}
            className="rounded-2xl"
          />
        </picture>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium text-foreground">
            <span className="text-sm sm:text-lg">{user.name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-muted-foreground">
              {relativeTime(new Date(user.$updatedAt))}
            </span>
          </figcaption>
          <p className="text-sm font-normal text-muted-foreground">
            <span>Reputation</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-muted-foreground">
              {user.prefs.reputation}
            </span>
          </p>
        </div>
      </div>
    </figure>
  );
};

export default async function TopContributers() {
  const allUsers = await users.list<UserPrefs>([Query.limit(100)]);
  const topUsers = allUsers.users
    .sort((a, b) => (b.prefs?.reputation ?? 0) - (a.prefs?.reputation ?? 0))
    .slice(0, 10);

  return (
    <div className="relative flex max-h-[400px] min-h-[400px] w-full max-w-[32rem] flex-col overflow-hidden rounded-lg bg-card/40 p-6 shadow-lg">
      <AnimatedList>
        {topUsers.map((user) => (
          <Notification user={user} key={user.$id} />
        ))}
      </AnimatedList>
    </div>
  );
}
