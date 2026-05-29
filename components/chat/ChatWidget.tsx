"use client";

import { useChatStore } from "@/store/useChatStore";
import ChatLauncher from "./ChatLauncher";
import ChatPanel from "./ChatPanel";

export default function ChatWidget() {
  const isOpen = useChatStore((s) => s.isOpen);

  return (
    <>
      <ChatLauncher hidden={isOpen} />
      {isOpen && <ChatPanel />}
    </>
  );
}
