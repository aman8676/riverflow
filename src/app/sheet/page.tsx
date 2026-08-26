import React from "react";
import { IconListCheck } from "@tabler/icons-react";

import SheetBuilder from "@/components/SheetBuilder";

export const metadata = {
  title: "Build your sheet | RiverFlow",
  description:
    "A personal DSA practice sheet — twenty Codeforces and LeetCode problems picked for your topic and your rating.",
};

const SheetPage = () => {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
          Practice
        </span>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Build your sheet
        </h1>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
          <IconListCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Pick a DSA topic and get twenty problems from Codeforces and LeetCode,
          graded to your rating. Each one links straight to the platform.
        </p>
      </div>

      <SheetBuilder />
    </div>
  );
};

export default SheetPage;
