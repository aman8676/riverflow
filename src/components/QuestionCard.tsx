"use client";

import React from "react";
import {BorderBeam} from "@/components/magicui/border-beam";
import Link from "next/link";

import {Models} from "appwrite";

import slugify from "slugify";

import {avatar} from "@/models/client/config";

import relativeTime from "@/utils/relativeTime";


interface Question extends Models.Document {
  title: string;
  content: string;
  author: {
    name:string
    email:string;
    $id:string;
    reputation: number;
  }
  tags: string[];
  totalVotes: number;
  totalAnswers: number;
}

const QuestionCard =({question}:{question:Question})=>{
    const [height,setHeight] = React.useState(0);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(()=>{
        if(ref.current){
            setHeight(ref.current.clientHeight);
        }
    },[ref]);

    return (
      <div
        ref={ref}
        className="relative flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-4 duration-200 hover:bg-card/80 sm:flex-row"
      >
        <BorderBeam size={height} duration={12} delay={9} />
        <div className="relative shrink-0 text-sm sm:text-right">
          <p>{question.totalVotes} votes</p>
          <p>{question.totalAnswers} answers</p>
        </div>

        <div className="relative flex flex-col gap-4">
          <Link
            href={`/questions/${question.$id}/${slugify(question.title)}`}
            className="text-orange-500 duration-200 hover:text-orange-600"
          >
            <h2 className="text-lg font-bold">{question.title}</h2>
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {question.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/questions?tag=${tag}`}
                className="inline-block rounded-lg bg-muted px-2 py-0.5 duration-200 hover:bg-muted/80"
              >
                #{tag}
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <picture>
                <img
                  src={avatar.getInitials(question.author.name, 24, 24).toString()}
                  alt={question.author.name}
                  className="rounded-lg"
                />
              </picture>
              <Link
                href={`/users/${question.author.$id}/${slugify(question.author.name)}`}
                className="text-orange-500 hover:text-orange-600"
              >
                {question.author.name}
              </Link>
              <strong>&quot;{question.author.reputation}&quot;</strong>
            </div>
            <span>
              asked {relativeTime(new Date(question.$createdAt))}
            </span>
          </div>
        </div>
      </div>
    );
  }

export default QuestionCard;








