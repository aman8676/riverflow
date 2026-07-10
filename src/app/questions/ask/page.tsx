import React from "react";
import QuestionForm from "@/components/QuestionForm";

const AskQuestionPage = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          Ask a Public Question
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          You&apos;re ready to pitch a question to the community. Use the field items
          below to express your problem clearly.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm md:p-8">
        <QuestionForm />
      </div>
    </div>
  );
};

export default AskQuestionPage;
