import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout({ children, onLogout }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar onLogout={onLogout} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-10">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
