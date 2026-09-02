import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte | Support Logistique",
  description: "Créer un compte sur la plateforme Support Logistique",
};

export default function SignUp() {
  return <SignUpForm />;
}
