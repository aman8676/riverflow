// in config.ts file here we have to make sure that how appwrite should be connected to our project and how we can use it in our project

import env from "@/app/env";

import { Client, Account,Avatars,Databases,Storage } from "appwrite";

const client = new Client()
  .setEndpoint(env.appwrite.endpoint) // 
  .setProject(env.appwrite.projectId); // Your project ID


const databases = new Databases(client);
const account = new Account(client);
const avatar = new Avatars(client);

const storage = new Storage(client);

export{client,databases,account,avatar,storage}