import { AppRouter } from "@/server/api/root";
import { inferRouterOutputs } from "@trpc/server";
import React from "react";

type RouterOutput = inferRouterOutputs<AppRouter>;

type Messages = RouterOutput["file"]["getFileMessages"]["messages"];

type OmitText = Omit<Messages[number], "text">;

type ExtendedText = {
    text: string | React.ReactNode;
};

export type ExtendedMessage = OmitText & ExtendedText;
