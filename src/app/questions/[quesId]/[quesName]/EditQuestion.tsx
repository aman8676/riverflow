"use client"

import {useAuthStore} from "@/store/auth"
import slugify from "slugify";
import {IconEdit} from "@tabler/icons-react";
import Link from "next/link"
import React from "react";

const EditQuestion = ({
    questionId,
    questionTitle,
    authorId,
}:{
    questionId:string,
    questionTitle:string,
    authorId:string
})=>{
    const {user} = useAuthStore();
    return user?.$id === authorId ? (
        <Link href={`/questions/${questionId}/${slugify(questionTitle)}/edit`} className="flex h-10 w-10 items-center justify-center rounded-full border p-1 duration-200 hover:bg-gray-100">
            <IconEdit className="h-5 w-5"/>
        </Link>
    ):null;
}

export default EditQuestion;
