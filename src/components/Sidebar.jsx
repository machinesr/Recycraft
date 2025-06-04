import { FaRecycle, FaCamera, FaHammer, FaBars } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { useState, useEffect } from "react";
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const path = location.pathname.toLowerCase();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    // Detect right swipe to open
    useEffect(() => {
        const handleTouchStart = (e) => {
            setTouchStartX(e.touches[0].clientX);
        };

        const handleTouchEnd = (e) => {
            setTouchEndX(e.changedTouches[0].clientX);
        };

        const handleSwipe = () => {
            if (touchStartX !== null && touchEndX !== null) {
                const diff = touchEndX - touchStartX;
                if (diff > 75) {
                    setSidebarOpen(true); // Right swipe
                }
            }
        };

        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [touchStartX, touchEndX]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (touchStartX !== null && touchEndX !== null) {
                const diff = touchEndX - touchStartX;
                if (diff > 75) {
                    setSidebarOpen(true);
                }
                setTouchStartX(null);
                setTouchEndX(null);
            }
        }, 100);

        return () => clearTimeout(timeout);
    }, [touchEndX]);

    return (
        <>
        {/* Sidebar */}
        <div className={`
            fixed z-20 md:static top-0 left-0 h-full bg-white shadow-xl w-72 px-6 py-8 flex flex-col gap-8
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:flex md:w-72
        `}>
            <div className="flex justify-start items-center gap-4 px-6">
                <FaRecycle className="text-emerald-600 text-3xl" />
                <h1 className="text-3xl text-emerald-600">Recycraft</h1>
            </div>
            <div className="flex flex-col gap-3 w-full">
                <NavButton name="Camera" icon={<FaCamera />} path={path} />
                <NavButton name="Collection" icon={<MdDashboard />} path={path} />
                <NavButton name="Crafts" icon={<FaHammer />} path={path} />
            </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
            <div className="fixed inset-0 bg-black opacity-50 z-10 md:block" onClick={closeSidebar}></div>
        )}

        {/* Swipe hint text */}
        <div className="fixed bottom-4 left-4 text-md text-black opacity-30 md:block z-10">
            Swipe for sidebar &raquo;
        </div>
        </>
    );
};

const NavButton = ({ name, icon, path }) => {
    const isActive = path.startsWith("/" + name.toLowerCase());

    return (
        <Link to={`/${name.toLowerCase()}`}>
            <button className={`flex flex-row justify-start items-center gap-4 py-4 px-6 rounded-lg w-full cursor-pointer transition-colors 
                                ${isActive ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                <h2 className="text-xl">{icon}</h2>
                <h2 className="text-md">{name}</h2>
            </button>
        </Link>
    );
};



export default Sidebar;
