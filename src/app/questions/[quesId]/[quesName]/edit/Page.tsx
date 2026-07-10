import {db,questionCollection} from "@/models/name";
import {databases} from "@/models/server/config";
import React from "react";
import {Models} from "appwrite";
import EditQues from "./EditQues";


type QuestionDocument = Models.Document & {
  title: string;
  content: string;
  tags: string[];
  attachmentId: string;
  authorId: string;
};



const Page = async ({params}:{params:Promise<{quesId:string;quesName:string}>})=>{
    const {quesId} = await params;
    const question = await databases.getDocument(db,questionCollection,quesId) as QuestionDocument;

    return <EditQues question={question}/>;
}

export type {QuestionDocument};
export default Page;