import { ChatPage } from "@/features/chat/components/chat-page";
import { requireAuth } from "@/lib/auth-utils";

const Page = async () => {
  await requireAuth();
  return <ChatPage />;
};

export default Page;
