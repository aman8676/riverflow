"use client";
import dynamic from "next/dynamic";

import Editor from "@uiw/react-markdown-editor";

import "@uiw/react-markdown-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const RTE = dynamic(
  () => import("@uiw/react-markdown-editor").then((mod =>{ return mod.default})),
  { ssr: false },
);

export const MarkdownPreview = Editor.Markdown

export default RTE;
