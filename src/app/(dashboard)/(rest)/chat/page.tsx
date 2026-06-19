import { ChatPage } from "@/features/chat/components/chat-page";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const Page = async ({ searchParams }: { searchParams: Promise<Record<string, string>> }) => {
  await requireAuth();
  const { id } = await searchParams;
  try {
    await Promise.all([
      prefetch(trpc.chat.getConversations.queryOptions({ search: "" })),
      prefetch(trpc.chat.getConversations.queryOptions({ search: "", joined: true })),
      ...(id ? [
        prefetch(trpc.chat.getMessages.queryOptions({ conversationId: id })),
        prefetch(trpc.chat.checkParticipant.queryOptions({ conversationId: id })),
      ] : []),
    ]);
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
