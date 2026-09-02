import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion | Support Logistique",
  description: "Connexion à la plateforme Support Logistique",
};

export default function SignIn() {
  return <SignInForm />;
}
