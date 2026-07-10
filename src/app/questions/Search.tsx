"use client"

import {Input} from "@/components/ui/input";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import React from "react";

const Search =()=>{
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathName = usePathname();
    const [search,setSearch] = React.useState(searchParams.get("search") || "");

    React.useEffect(() => {
      setSearch(() => searchParams.get("search") || "");
    }, [searchParams]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("search", search);
        router.push(`${pathName}?${newSearchParams}`);
    };


    return (
        <form className ="flex w-full items-center gap 2" onSubmit={handleSearch}>
            <Input type="text" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="shrink-0 rounded bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600">
                Search
            </button>
        </form>
    );
}


export default Search;