import { HeroUIProvider } from "@heroui/react";

export const LandingLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <HeroUIProvider>
            <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans selection:bg-blue-500/30">
                {/* Clean background - no noise texture for professional look */}
                <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-slate-900 via-slate-950 to-black" />

                <div className="relative z-10">
                    {children}
                </div>
            </div>
        </HeroUIProvider>
    );
};
