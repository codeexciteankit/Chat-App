import React from "react";
import { useChatStore } from "../Store/useChatStore";
import Sidebar from "../components/SideBar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="w-full h-full min-h-0 flex bg-base-200 overflow-hidden">
      {/* Sidebar - Visible on mobile if no user selected, always visible on desktop */}
      <div className={`min-h-0 flex-shrink-0 w-full lg:w-72 ${selectedUser ? "hidden lg:block" : "block"}`}>
        <Sidebar />
      </div>

      {/* Chat Area - Visible on mobile if user selected, always visible on desktop */}
      <div className={`min-w-0 min-h-0 flex-1 overflow-hidden w-full ${!selectedUser ? "hidden lg:flex" : "flex"}`}>
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default HomePage;
