import { avatar } from "@/models/client/config";
import relativeTime from "@/utils/relativeTime";
import { users } from "@/models/server/config";
import { UserPrefs } from "@/store/auth";
import React from "react";
import EditButton from "./EditButton";
import Navbar from "./Navbar";
import { IconClockFilled, IconUserFilled } from "@tabler/icons-react";

const Layout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string; userSlug: string }>;
}) => {
  const { userId } = await params;
  const user = await users.get<UserPrefs>(userId);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <picture className="block shrink-0">
              <img
                src={avatar.getInitials(user.name, 72, 72)}
                alt={user.name}
                className="h-18 w-18 rounded-2xl object-cover ring-2 ring-border"
              />
            </picture>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {user.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <IconUserFilled className="h-3.5 w-3.5" />
                  Member {relativeTime(new Date(user.$createdAt))}
                </span>
                <span className="flex items-center gap-1.5">
                  <IconClockFilled className="h-3.5 w-3.5" />
                  Last active {relativeTime(new Date(user.$updatedAt))}
                </span>
              </div>
            </div>
          </div>
          <EditButton />
        </div>

        <div className="flex gap-12">
          <Navbar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
