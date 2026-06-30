"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CopyIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { useInviteMember } from "../hooks/use-organizations";
import { ASSIGNABLE_ROLES, ROLE_META } from "../utils/roles";

const formSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  role: z.enum(["admin", "editor", "livechat", "readonly"] as const),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export const InviteMemberDialog = ({ open, onOpenChange, organizationId }: Props) => {
  const inviteMember = useInviteMember();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", role: "readonly" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ email: "", role: "readonly" });
      setInviteUrl(null);
      setCopied(false);
    }
  }, [open, form]);

  const handleSubmit = async (values: FormValues) => {
    const invitation = await inviteMember.mutateAsync({
      organizationId,
      email: values.email,
      role: values.role,
    });
    const url = `${window.location.origin}/accept-invitation?id=${invitation.id}`;
    setInviteUrl(url);
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} forceDialog>
      <DialogContent>
        {inviteUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitación creada</DialogTitle>
              <DialogDescription>
                Comparte este enlace o código QR con la persona que deseas invitar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-xl border bg-white p-3">
                <QRCodeSVG value={inviteUrl} size={180} />
              </div>
              <div className="flex w-full items-center gap-2">
                <Input readOnly value={inviteUrl} className="text-xs" />
                <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invitar miembro</DialogTitle>
              <DialogDescription>
                Envía una invitación para unirse a la organización
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="miembro@ejemplo.com"
                          {...field}
                          disabled={inviteMember.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        El correo de la persona que deseas invitar.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={inviteMember.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_META[r].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {form.watch("role") ? ROLE_META[form.watch("role")].description : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={inviteMember.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? "Creando..." : "Crear invitación"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
