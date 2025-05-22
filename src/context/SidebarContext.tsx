import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

// Create context with default values
const SidebarContext = createContext<SidebarContextType>({
  isSidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
});

// Custom hook for using the sidebar context
export const useSidebar = () => useContext(SidebarContext);

// Provider component that wraps your app and makes sidebar state available to any child component
export const SidebarProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prevState => !prevState);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const value = {
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};