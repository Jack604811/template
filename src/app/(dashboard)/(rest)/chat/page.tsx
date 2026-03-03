import { requireAuth } from "@/lib/auth-utils";
import Ai04 from "@/components/ai-04";

const Page = async () => {
  await requireAuth();

  return (
    <div className="">
      <div className="">
        <Ai04 />
      </div>
    </div>
  );
};

export default Page;
