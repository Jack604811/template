import { requireAuth } from "@/lib/auth-utils";
import { CreateWhatsAppTemplateWizard } from "@/features/whatsapp-templates/components/create-template-wizard";

type Props = {
  params: Promise<{ credentialId: string }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { credentialId } = await params;

  return <CreateWhatsAppTemplateWizard credentialId={credentialId} />;
};

export default Page;
