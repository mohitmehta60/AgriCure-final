import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Menu, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ProfileModal from "./ProfileModal";
import { authService } from "@/services/authService";
import { UserProfile } from "@/services/supabaseClient";

interface DashboardHeaderProps {
  user?: any;
  userProfile?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
}

const DashboardHeader = ({ user, userProfile, onProfileUpdate }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleProfileUpdate = (profile: UserProfile) => {
    if (onProfileUpdate) {
      onProfileUpdate(profile);
    }
  };

  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <>
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group transition-all duration-300 hover:scale-105">
            <img src="/logo.png" alt="AgriCure Logo" className="h-6 w-6 sm:h-8 sm:w-8 transition-transform duration-300 group-hover:rotate-12" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-grass-800 transition-colors duration-300 group-hover:text-grass-600">AgriCure</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2 md:space-x-4">
            <div className="text-gray-700 font-medium text-sm md:text-base px-3 py-2 bg-grass-50 rounded-lg border border-grass-200 transition-all duration-300 hover:bg-grass-100">
              Welcome, <span className="text-grass-700 font-semibold">{displayName}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base p-2 hover:bg-grass-50 transition-all duration-300 hover:scale-105">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden lg:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <DropdownMenuItem 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="hover:bg-grass-50 transition-colors duration-200 cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-grass-50 transition-colors duration-200 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50 text-red-600 transition-colors duration-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-grass-50 transition-all duration-300">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b bg-grass-50">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">Farmer Dashboard</p>
                </div>
                <DropdownMenuItem 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="hover:bg-grass-50 transition-colors duration-200 cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-grass-50 transition-colors duration-200 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50 text-red-600 transition-colors duration-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    
    <ProfileModal
      isOpen={isProfileModalOpen}
      onClose={() => setIsProfileModalOpen(false)}
      user={user}
      onProfileUpdate={handleProfileUpdate}
    />
    </>
  );
};

export default DashboardHeader;