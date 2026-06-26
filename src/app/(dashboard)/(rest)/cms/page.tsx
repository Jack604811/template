import { requireAuth } from "@/lib/auth-utils";

const Page = async () => {
  await requireAuth();

  return (
    <div className="flex flex-col h-full">
      <h1 className="hidden sm:block px-4 pt-6 pb-2 text-2xl font-bold tracking-tight">CMS</h1>
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Content coming soon
      </div>
    </div>
  );
};

export default Page;
