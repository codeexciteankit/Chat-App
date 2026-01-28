import React from "react";
import { useChatStore } from "../Store/useChatStore";
import Sidebar from "../components/SideBar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="w-full h-full flex bg-base-200 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Chat Area - Main Content */}
      <div className="flex-1 overflow-hidden">
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default HomePage;
