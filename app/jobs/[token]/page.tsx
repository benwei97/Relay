import { redirect } from "next/navigation";

export default async function LegacyJobPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/contractor/job/${token}`);
}
