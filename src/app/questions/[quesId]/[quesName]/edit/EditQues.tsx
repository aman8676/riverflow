"use client";

import QuestionForm from "@/components/QuestionForm";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { Models } from "appwrite";
import React from "react";

import {QuestionDocument} from "./Page";


const EditQues = ({ question }: { question: QuestionDocument })=>{
    const { user } = useAuthStore();
    const router = useRouter();

    React.useEffect(()=>{
        if(question.authorId !== user?.$id){
            router.push(`/questions/${question.$id}/${slugify(question.title)}`);
        }
    },[]);

    if(user?.$id !== question.authorId) return null;

    return (
      <div className="block pb-20 pt-32">
        <div className="container mx-auto px-4">
          <h1 className="mb-6 text-3xl font-bold">Edit Question</h1>
          <div className="flex flex-wrap md:flex-row-reverse">
            <div className="w-full md:w-1/3"></div>
            <div className="w-full md:w-2/3">
              <QuestionForm question={question} />
            </div>
          </div>
        </div>
      </div>
    );
}

export default EditQues;
