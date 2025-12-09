import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
  return (
    <div className="flex justify-center p-6">
      <UserProfile 
        routing="hash"
        appearance={{
            elements: {
                rootBox: "w-full max-w-4xl",
                card: "bg-sidebar border border-white/10 shadow-xl",
                headerTitle: "text-white",
                headerSubtitle: "text-zinc-400",
                navbarButton: "text-zinc-400 hover:text-white hover:bg-white/5",
                navbarButtonActive: "text-gold bg-white/10",
                formFieldLabel: "text-white",
                formFieldInput: "bg-black/20 border-white/10 text-white",
                formButtonPrimary: "bg-gold text-black hover:bg-yellow-500",
            }
        }}
      />
    </div>
  );
}

