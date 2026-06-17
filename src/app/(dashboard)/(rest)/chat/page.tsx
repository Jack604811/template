import { ChatPage } from "@/features/chat/components/chat-page";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const Page = async () => {
  await requireAuth();
  try {
    await prefetch(trpc.chat.getConversations.queryOptions({ search: "" }));
  } catch {
    // Client will fetch
  }
  return (
    <HydrateClient>
      <ChatPage />
    </HydrateClient>
  );
};

export default Page;
